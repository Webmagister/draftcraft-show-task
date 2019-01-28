import Render from '../modules/Render';
import FetchWorker from '../modules/FetchWorker';
import Title from './Title/Title';
import OrderedList from './OrderedList/OrderedList';
import ListItem, {IListItemProps} from "./ListItem/ListItem";
import Button from "./Button/Button";
import Form from "./Form/Form";
import BackButton from "./BackButton/BackButton";

enum Route {TOPICS, TYPES, TASKS, FORM}

export interface IInfo {
    id: number;
    title: string;
    types?: number[];
    tasks?: number[];
    taskImage?: string;
    help?: string;
    task?: string;
}

export interface IData {
    [id: number]: IInfo;
}

export interface IClickHandlerParams {
    type?: string;
    nextIds?: number[];
    title?: string;
    taskImage?: string;
    help?: string;
    task?: string;
}

interface IAppProps {
    route: Route;
    taskImage?: string;
    help?: string;
    task?: string;
    title?: string
}

interface IPageState {
    topics: IListItemProps[];
    types: IListItemProps[];
}

class App {
    private static getNextIds(currType: string, data: IInfo): number[] {
        switch (currType) {
            case 'topic':
                return data.types;
            case 'type':
                return data.tasks;
            default:
                return [];
        }
    }

    public readonly element: HTMLElement;
    private readonly backButton: HTMLButtonElement;

    private listItemsData: IListItemProps[] = [];
    private pageState: IPageState = {
        topics: [],
        types: [],
    };
    private props: IAppProps = {
        route: Route.TOPICS
    };

    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('grid-container');

        this.fetchTopics();

        this.listItemClickHandler = this.listItemClickHandler.bind(this);
        this.openNewTaskCreationForm = this.openNewTaskCreationForm.bind(this);
        this.handlerBackButton = this.handlerBackButton.bind(this);

        this.backButton = new BackButton(this.handlerBackButton).element;
    }

    private fetchTopics(): void {
        FetchWorker.fetchTopics()
            .then((data: IData) => {
                this.setUpData(data, 'topic');

                this.props.route = Route.TOPICS;
                this.render();
            })
            .catch((error: Error) => console.error(error));
    }

    private handlerBackButton(): void {
        if (this.props.route === Route.TYPES) {
            this.props.route = Route.TOPICS;
            this.listItemsData = [...this.pageState.topics];
        }

        if (this.props.route === Route.TASKS) {
            this.props.route = Route.TYPES;
            this.listItemsData = [...this.pageState.types];
        }

        if (this.props.route === Route.FORM) this.props.route = Route.TASKS;

        this.render();
    }

    private fetchTypes(ids: number[]): void {
        FetchWorker.fetchTypes()
            .then((data: IData) => {
                const dataToSet: IInfo[] = ids.map((id: number): IInfo => data[id]);
                this.setUpData(dataToSet, 'type');

                this.props.route = Route.TYPES;
                this.render();
            })
            .catch((error: Error) => console.error(error));
    }

    private fetchTasks(ids: number[]): void {
        FetchWorker.fetchTasks()
            .then((data: IData) => {
                const dataToSet: IInfo[] = ids.map((id: number): IInfo => data[id]);
                this.setUpData(dataToSet, 'task');

                this.props.route = Route.TASKS;
                this.render();
            })
            .catch((error: Error) => console.error(error));
    }

    private setUpData(data: IData | IInfo[], type: string): void {
        this.savePageData();
        this.listItemsData = [];

        for (const prop in data) {
            const props: IListItemProps = {
                title: data[prop].title,
                type,
                nextIds: App.getNextIds(type, data[prop]),
                clickHandler: this.listItemClickHandler,
                task: data[prop].task,
                taskImage: data[prop].taskImage,
                help: data[prop].help
            };

            this.listItemsData.push(props);
        }
    }

    private savePageData(): void {
        if (this.props.route === Route.TOPICS) this.pageState.topics = [...this.listItemsData];
        if (this.props.route === Route.TYPES) this.pageState.types = [...this.listItemsData];
    }

    private render() {
        if (this.props.route === Route.TOPICS) {
            this.backButton.classList.add('hidden');
        } else {
            this.backButton.classList.remove('hidden');
        }

        Render(this.element, this.backButton, ...this.getElements());
    }

    private getFormElements(): HTMLElement[] {
        return [new Form({...this.props}).element];
    }

    private getElements(): HTMLElement[] {
        if (this.props.route === Route.TOPICS) return this.getTopicsElements();
        if (this.props.route === Route.TYPES) return this.getTypesElements();
        if (this.props.route === Route.TASKS) return this.getTasksElements();
        if (this.props.route === Route.FORM) return this.getFormElements();
    }

    private getTopicsElements(): HTMLElement[] {
        const title: HTMLHeadingElement = new Title('Все темы').element;
        const list: HTMLOListElement = new OrderedList(...this.getListItems()).element;
        const button: HTMLButtonElement = new Button({text: 'Добавить новое'}).element;

        return [title, list, button];
    }

    private getTypesElements(): HTMLElement[] {
        const title: HTMLHeadingElement = new Title('Все задания').element;
        const list: HTMLOListElement = new OrderedList(...this.getListItems()).element;
        const button: HTMLButtonElement = new Button({text: 'Добавить новое'}).element;

        return [title, list, button];
    }

    private getTasksElements(): HTMLElement[] {
        const title: HTMLHeadingElement = new Title('Все упражнения').element;
        const list: HTMLOListElement = new OrderedList(...this.getListItems()).element;
        const button: HTMLButtonElement = new Button({
            text: 'Добавить новое',
            clickHandler: this.openNewTaskCreationForm
        }).element;

        return [title, list, button];
    }

    private openNewTaskCreationForm(): void {
        this.props.route = Route.FORM;

        this.props.help = null;
        this.props.taskImage = null;
        this.props.title = null;
        this.props.task = null;

        this.render();
    }

    private getListItems(): HTMLLIElement[] {
        return this.listItemsData.map((props: IListItemProps) => new ListItem(props).element);
    }

    private listItemClickHandler({type, nextIds, title, taskImage, help, task}: IClickHandlerParams): void {
        if (type === 'topic') this.fetchTypes(nextIds);
        if (type === 'type') this.fetchTasks(nextIds);
        if (type === 'task') {
            this.props.route = Route.FORM;
            this.props.help = help;
            this.props.taskImage = taskImage;
            this.props.title = title;
            this.props.task = task;

            this.render();
        }
    }
}

export default new App().element;