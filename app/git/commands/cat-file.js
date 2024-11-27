class CatFileCommand {
    constructor(flag, commitSHA) {
        this.flag = flag;
        this.commitSHA = commitSHA;
    }

    execcute() {
        //* steps
        // navigate to .git/objects/commitSHA[0..2]
        // read the file .git/objects/commitSHA[3..40]
        // decompress the file using zlib
        // parse the content (output) 
    }
}

module.exports = CatFileCommand;