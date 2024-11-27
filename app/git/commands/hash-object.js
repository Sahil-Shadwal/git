class HashObjectCommand{
    constructor(flag, filePath){
        this.flag = flag;
        this.filePath = filePath;

    }

    execute(){
        //* steps
        // 1. Make sure the file exists
        // 2. Read the file contents
        // 3. Create a blob object
        // 4. Compress the blob object
        // 5. Calculate the SHA-1 hash of the compressed object
        // 6. If -w flag is present, write the object to the objects directory
        // 7. Return the SHA-1 hash of the object
    }

}

module.exports = HashObjectCommand;