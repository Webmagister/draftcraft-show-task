import {IData} from "../components/App";

class FetchWorker {
    private readonly dataFetchUrl: string;

    constructor() {
        this.dataFetchUrl = 'testDb/full.json';
    }

    public fetchData(): Promise<IData> {
        return fetch(this.dataFetchUrl)
            .then((response: Response) => response.json())
            .catch(() => {throw new Error(`Cannot fetch data from ${this.dataFetchUrl}`)});
    }
}

export default new FetchWorker();
