const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

class HashObjectCommand{
    constructor(flag, filePath){
        this.flag = flag;
        this.filePath = filePath;

    }

    execute(){
        //* steps
        // 1. Make sure the file exists
        const filePath = path.resolve(this.filePath);

        if(!fs.existsSync(filePath)){
            throw new Error(`Could not open ${this.filePath} for reading: No such file or directory`);
        }
        // 2. Read the file contents
        const fileContents = fs.readFileSync(filePath);
        const fileLength = fileContents.length;

        // 3. Create a blob object
        const header = `blob ${fileLength}\0`;
        
        const blob = Buffer.concat([Buffer.from(header), fileContents]);
        // 4. Calculate the SHA-1 hash of the uncompressed blob
        const hash = crypto.createHash("sha1").update(blob).digest("hex");
        // 5. If -w flag is present, write the object to the objects directory
        if(this.flag && this.flag === '-w'){
            const folder = hash.slice(0,2);
            const file = hash.slice(2);

            const completeFolderPath = path.join(process.cwd(),".git", "objects", folder);

            if(!fs.existsSync(completeFolderPath)){
                fs.mkdirSync(completeFolderPath);
            }
            const compressedObject = zlib.deflateSync(blob);
            fs.writeFileSync(path.join(completeFolderPath, file), compressedObject);
        }
        // 6. Return the SHA-1 hash of the object
        process.stdout.write(hash);
    }

}

module.exports = HashObjectCommand;