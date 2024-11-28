const path = require("path");
const fs = require("fs");
const https = require("https");
const zlib = require("zlib");
const crypto = require("crypto");

function createGitDirectory(folderPath, branch = "main") {
    fs.mkdirSync(path.join(folderPath, ".git"), { recursive: true });
    fs.mkdirSync(path.join(folderPath, ".git", "objects"), { recursive: true });
    fs.mkdirSync(path.join(folderPath, ".git", "refs"), { recursive: true });

    fs.writeFileSync(
        path.join(folderPath, ".git", "HEAD"),
        `ref: refs/heads/${branch}\n`
    );
}

function writeDataToFile(sha, data, dir) {
    const basePath = path.join(process.cwd(), dir, ".git", "objects");
    const folder = sha.slice(0, 2);
    const file = sha.slice(2);

    const folderPath = path.join(basePath, folder);

    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    const compressed = zlib.deflateSync(data);
    fs.writeFileSync(path.join(folderPath, file), compressed);
}

function parsePackfile(buffer, dir) {
    let offset = 0;

    // Read packfile header
    const header = buffer.slice(offset, offset + 4);
    offset += 4;
    if (header.toString() !== 'PACK') {
        throw new Error('Invalid packfile header');
    }

    // Read version
    const version = buffer.readUInt32BE(offset);
    offset += 4;
    if (version !== 2) {
        throw new Error('Unsupported packfile version');
    }

    // Read number of objects
    const numberOfObjects = buffer.readUInt32BE(offset);
    offset += 4;

    for (let i = 0; i < numberOfObjects; i++) {
        // Read object type and size
        let byte = buffer.readUInt8(offset);
        offset += 1;
        const type = (byte >> 4) & 0x07;
        let size = byte & 0x0f;
        let shift = 4;

        while (byte & 0x80) {
            byte = buffer.readUInt8(offset);
            offset += 1;
            size |= (byte & 0x7f) << shift;
            shift += 7;
        }

        // Read object data
        const data = buffer.slice(offset, offset + size);
        offset += size;

        // Decompress object data
        const decompressed = zlib.inflateSync(data);

        // Calculate SHA-1 hash of the decompressed data
        const sha = crypto.createHash('sha1').update(decompressed).digest('hex');

        // Write object to .git/objects directory
        writeDataToFile(sha, decompressed, dir);
    }
}

class CloneCommand {
    constructor(url, dir) {
        this.url = url;
        this.dir = dir;
        this.gitFolderPath = path.join(process.cwd(), dir);
    }

    async #getRefObject(ref, sha, url) {
        const body = Buffer.from(`0032want ${sha}\n00000009done\n`, "utf8");
        console.log({ url });
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/x-git-upload-pack-request",
            },
            responseType: "arraybuffer",
        };

        return new Promise((resolve, reject) => {
            const req = https.request(`${url}/git-upload-pack`, options, (res) => {
                let responseBuffer = Buffer.alloc(0);

                res.on("data", (chunk) => {
                    responseBuffer = Buffer.concat([responseBuffer, chunk]);
                });

                res.on("end", () => {
                    console.log(responseBuffer.length);
                    parsePackfile(responseBuffer, this.dir);
                    resolve(responseBuffer);
                });
            });

            req.on("error", (e) => {
                reject(`Some error occurred: ${e.message}`);
            });
            req.write(body);
            req.end();
        });
    }

    async #fetchRefs(repoUrl) {
        return new Promise((resolve, reject) => {
            https.get(`${repoUrl}/info/refs?service=git-upload-pack`, (res) => {
                let responseBuffer = Buffer.alloc(0);
                res.on("data", (chunk) => {
                    responseBuffer = Buffer.concat([responseBuffer, Buffer.from(chunk)]);
                });

                res.on("end", () => {
                    const response = responseBuffer.toString();
                    const size = response.length;

                    if (size <= 3) {
                        fs.rmSync(this.gitFolderPath, { recursive: true, force: true });
                        process.stdout.write("remote: Repository not found\n");
                        reject(new Error(`repository '${repoUrl}' not found`));
                    }

                    resolve(response);
                });
            });
        });
    }

    async execute() {
        const url = this.url;
        const dir = this.dir;
        const gitFolderPath = this.gitFolderPath;

        createGitDirectory(gitFolderPath, { writeToHead: false });

        const responseString = await this.#fetchRefs(url);
        const responses = responseString.split("\n");

        let [compatibleSHA, ...data] = responses[1].split(" ");
        if (compatibleSHA.substring(0, 4) === "0000") {
            compatibleSHA = compatibleSHA.slice(4);
        }

        const parsedData = responses.slice(2, responses.length - 1).map((item) => {
            const [refHash, ref] = item.split(" ");

            const sha = refHash.slice(4);
            return { sha, ref };
        });

        const main = parsedData.filter(
            (item) =>
                item.ref.includes("refs/heads/main") ||
                item.ref.includes("refs/heads/master")
        )[0];

        const mainSha = main.sha;
        const mainRef = main.ref;

        console.log({ mainRef, mainSha });

        const buffer = await this.#getRefObject(mainRef, mainSha, url);
        console.log(buffer);
    }
}

module.exports = CloneCommand;