const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");
const path = require("path");

function writeDataToFile(sha, data) {
	const basePath = path.join(process.cwd(), ".git", "objects");
	const folder = sha.slice(0, 2);
	const file = sha.slice(2);

	const folderPath = path.join(basePath, folder);

	if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
	const compressed = zlib.deflateSync(data);
	fs.writeFileSync(path.join(folderPath, file), compressed);
}

const email = "sahilshadwal@gmail.com";
const name = "Sahil Shadwal";
const date = Date.now();
const timeZone = "+0530";

class CommitTreeCommand {
	constructor(treeSHA, parentSHA, msg) {
		this.treeSHA = treeSHA;
		this.parentSHA = parentSHA;
		this.msg = msg;
	}

	execute() {
		const treeSHA = this.treeSHA;
		const parentSHA = this.parentSHA;
		const msg = this.msg;
		const commitContentBuffer = Buffer.concat([
			Buffer.from(`tree ${treeSHA}\n`),
			Buffer.from(`parent ${parentSHA}\n`),
			Buffer.from(`author ${name} <${email}> <${date}> ${timeZone}\n`),
			Buffer.from(`committer ${name} <${email}> ${date} ${timeZone}\n\n`),
			Buffer.from(`${msg}\n`),
		]);

		const header = `commit ${commitContentBuffer.length}\0`;
		const commit = Buffer.concat([Buffer.from(header), commitContentBuffer]);

		const commitSHA = crypto.createHash("sha1").update(commit).digest("hex");
		writeDataToFile(commitSHA, commit);

    process.stdout.write(commitSHA);
	}
}

module.exports = CommitTreeCommand;