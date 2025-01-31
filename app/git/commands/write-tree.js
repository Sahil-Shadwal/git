const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

function writeFileBlob(currentPath){
    const contents = fs.readFileSync(currentPath);
    const len = contents.length;

    const header = `blob ${len}\0`;
    const blob = Buffer.concat([Buffer.from(header), contents]);

    const hash = crypto.createHash("sha1").update(blob).digest("hex");

    const folder = hash.slice(0,2);
    const file = hash.slice(2);

    const completeFolderPath = path.join(process.cwd(),".git", "objects", folder);
    if(!fs.existsSync(completeFolderPath)){
        fs.mkdirSync(completeFolderPath);
    }
    const compressedData = zlib.deflateSync(blob);
    fs.writeFileSync(path.join(completeFolderPath, file), compressedData);

    return hash;

}
class WriteTreeCommand {
    constructor(){

    }

    execute(){
        //* steps
        // 1. Recursive read all the file and directory
        function recursiveCreateTree(basePath){
            const result = [];
            const dirContents = fs.readdirSync(basePath);

            for(const dirContent of dirContents){

                if(dirContent.includes(".git"))continue;//might face error

                const currentPath = path.join(basePath, dirContent);
                const stat = fs.statSync(currentPath);

                if(stat.isDirectory()){
                    const sha = recursiveCreateTree(currentPath);
                    if(sha){
                        result.push({
                            mode: "40000",
                            basename: dirContent,
                            // type: "tree",
                            sha,
                        });
                    }
                }else if(stat.isFile()){
                    const sha = writeFileBlob(currentPath);
                    result.push({
                        mode: "100644",
                        basename: path.basename(currentPath),
                        // type: "blob",
                        sha,
                    });
                }
            }

            if(dirContents.length === 0 || result.length === 0){
                return null;
            }
            const treeData = result.reduce((acc, current) => {
                const {mode, basename, sha} = current;
                const entry = Buffer.concat([
                    Buffer.from(`${mode} ${basename}\0`, "utf-8"),
                    Buffer.from(sha, "hex")
                ]);
                return Buffer.concat([acc, entry]);
            }, Buffer.alloc(0));

            const tree = Buffer.concat([
                Buffer.from(`tree ${treeData.length}\0`),
                treeData
            ]);

            const hash = crypto.createHash("sha1").update(tree).digest("hex");

            const folder = hash.slice(0,2);
            const file = hash.slice(2);

            const treeFolderPath = path.join(process.cwd(), ".git", "objects", folder);

            if(!fs.existsSync(treeFolderPath)){
                fs.mkdirSync(treeFolderPath);
            }

            const compressedData = zlib.deflateSync(tree);
            fs.writeFileSync(path.join(treeFolderPath, file), compressedData);

            return hash;

        }
        const sha = recursiveCreateTree(process.cwd());
        process.stdout.write(sha);
    }   
}

module.exports = WriteTreeCommand;