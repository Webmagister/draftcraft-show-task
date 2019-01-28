import {IData} from "../components/App";

class FetchWorker {
    private readonly tasksFetchUrl: string;
    private readonly topicsFetchUrl: string;
    private readonly typesFetchUrl: string;

    constructor() {
        this.topicsFetchUrl = 'testDb/topics.json';
        this.typesFetchUrl = 'testDb/types.json';
        this.tasksFetchUrl = 'testDb/tasks.json';
    }

    public fetchTopics(): Promise<IData> {
        return fetch(this.topicsFetchUrl)
            .then((response: Response) => response.json())
            .catch(() => {throw new Error(`Cannot fetch data from ${this.topicsFetchUrl}`)});
    }

    public fetchTypes(): Promise<IData> {
        return fetch(this.typesFetchUrl)
            .then((response: Response) => response.json())
            .catch(() => {throw new Error(`Cannot fetch data from ${this.topicsFetchUrl}`)});
    }

    public fetchTasks(): Promise<IData> {
        return fetch(this.tasksFetchUrl)
            .then((response: Response) => response.json())
            .catch(() => {throw new Error(`Cannot fetch data from ${this.topicsFetchUrl}`)});
    }
}

export default new FetchWorker();
