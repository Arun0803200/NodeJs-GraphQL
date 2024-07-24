type Data = { [key: string]: any };
export class Settings {
    private data: Data
    constructor() {
        this.data = {}
    }

     getData(key: string, value: any) {
        this.data[key] = value;
    }

    setData(key: string) {
        if (!this.data[key]) {
            throw new Error(`Key '${key}' does not exist in the store data.`);
        }
        return this.data[key];
    }
}