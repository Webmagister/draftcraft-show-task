import Render from '../modules/Render';
import FetchWorker from '../modules/FetchWorker';
import Title from './Title/Title';
import OrderedList from './OrderedList/OrderedList';
import ListItem, {IListItemProps} from "./ListItem/ListItem";
import Button from "./Button/Button";
import Form, {FormType} from "./Form/Form";
import BackButton from "./BackButton/BackButton";
import Embed from './Embed/Embed';

enum Route {TOPICS = 'topics', TYPES = 'types', TASKS = 'tasks', FORM = 'form'}

export interface ITask {
    id?: number;
    img: string;
    help: string;
    task: string;
    correct: string;
}

interface ITopic {
    id?: number;
    title: string;
    types?: number[];
}

interface IType extends ITopic{
    tasks: number[];
}

export interface IData {
    topics: ITopic[];
    types: IType[];
    tasks: ITask[];
}

export interface IClickHandlerParams {
    type?: string;
    nextIds?: number[];
    title?: string;
    img?: string;
    help?: string;
    task?: string;
    id?: number;
}

interface IAppProps {
    route: Route;
    id: number;
    data?: IData;
    img?: string;
    help?: string;
    task?: string;
    title?: string;
    formType?: FormType;
}

export interface ISubmitHandlerParams {
    id?: number;
    formType?: FormType;
    title?: HTMLDivElement;
    task?: HTMLDivElement;
    help?: HTMLDivElement;
    fileInput?: HTMLInputElement;
    embed?: Embed;
}

interface IRequestData {
    data: IData;
}

class App {
    public readonly element: HTMLElement;
    private readonly backButton: HTMLButtonElement;

    private listItemsData: IListItemProps[] = [];
    private typesPageState: IListItemProps[] = [];
    private nextIds: number[] = [];
    private props: IAppProps = {
        route: Route.TOPICS,
        id: null,
    };
    private previousRoute: Route;

    constructor() {
        this.element = document.createElement('div');
        this.element.classList.add('grid-container');

        this.fetchData();
        this.props.route = Route.TOPICS;

        this.listItemClickHandler = this.listItemClickHandler.bind(this);
        this.openNewTaskCreationForm = this.openNewTaskCreationForm.bind(this);
        this.handlerBackButton = this.handlerBackButton.bind(this);
        this.submitHandler = this.submitHandler.bind(this);

        this.backButton = new BackButton(this.handlerBackButton).element;
    }

    private fetchData(): void {
        FetchWorker.fetchData()
            .then((data: IData) => {
                this.props.data = data;

                this.render();
            })
            .catch((error: Error) => console.error(error));
    }

    private handlerBackButton(): void {
        if (this.props.route === Route.TYPES) this.props.route = Route.TOPICS;
        if (this.props.route === Route.TASKS) this.props.route = Route.TYPES;
        if (this.props.route === Route.FORM) this.props.route = this.previousRoute;

        this.render();
    }

    private setUpData(): void {
        if (this.props.route === Route.FORM) return;

        const {route} = this.props;

        if (route === Route.TOPICS) this.listItemsData = this.getTopicsData();
        if (route === Route.TYPES) this.listItemsData = this.getTypesData();
        if (route === Route.TASKS) this.listItemsData = this.getTasksData();
    }

    private getTopicsData(): IListItemProps[] {
        return this.props.data.topics.map((item: ITopic): IListItemProps => {
            return {
                id: item.id,
                type: 'topic',
                title: item.title,
                nextIds: item.types,
                clickHandler: this.listItemClickHandler
            };
        });
    }

    private getTypesData(): IListItemProps[] {
        if (this.typesPageState.length !== 0) {
            const listItemsProps: IListItemProps[] = [...this.typesPageState];
            this.typesPageState = [];

            return listItemsProps;
        }

        return this.props.data.types.filter((item: IType): boolean => {
            return this.nextIds.includes(item.id);
        }).map((item: IType): IListItemProps => {
            return {
                id: item.id,
                type: 'type',
                title: item.title,
                nextIds: item.tasks,
                clickHandler: this.listItemClickHandler
            };
        });
    }

    private getTasksData(): IListItemProps[] {
        return this.props.data.tasks.filter((item: ITask): boolean => {
            return this.nextIds.includes(item.id);
        }).map((item: ITask): IListItemProps => {
            return {
                id: item.id,
                type: 'task',
                clickHandler: this.listItemClickHandler,
                img: item.img,
                help: item.help,
                task: item.task
            };
        });
    }

    private savePageData(): void {
        if (this.props.route === Route.TYPES) this.typesPageState = [...this.listItemsData];
    }

    private render() {
        if (this.props.route === Route.TOPICS) {
            this.backButton.classList.add('hidden');
        } else {
            this.backButton.classList.remove('hidden');
        }

        this.setUpData();

        Render(this.element, this.backButton, ...this.getElements());
    }

    private getFormElements(): HTMLElement[] {
        return [new Form({...this.props, submitHandler: this.submitHandler}).element];
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
        const button: HTMLButtonElement = new Button({
            text: 'Добавить новое',
            clickHandler: this.openNewTaskCreationForm
        }).element;

        return [title, list, button];
    }

    private getTypesElements(): HTMLElement[] {
        const title: HTMLHeadingElement = new Title('Все задания').element;
        const list: HTMLOListElement = new OrderedList(...this.getListItems()).element;
        const button: HTMLButtonElement = new Button({
            text: 'Добавить новое',
            clickHandler: this.openNewTaskCreationForm
        }).element;

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
        this.savePageData();
        if (this.props.route === Route.TOPICS) {
            this.previousRoute = Route.TOPICS;
            this.props.formType = FormType.topic;
        } else if (this.props.route === Route.TYPES) {
            this.previousRoute = Route.TYPES;
            this.props.formType = FormType.type;
        } else {
            this.previousRoute = Route.TASKS;
            this.props.formType = FormType.task;
        }

        this.props.route = Route.FORM;

        if (this.props.formType === FormType.topic) {
            this.props.title = null;
            this.props.id = null;
        } else if (this.props.formType === FormType.type) {
            this.props.title = null;
            this.props.id = null;
        } else {
            this.props.help = null;
            this.props.img = null;
            this.props.title = null;
            this.props.task = null;
            this.props.id = null;
        }

        this.render();
    }

    private getListItems(): HTMLLIElement[] {
        return this.listItemsData.map((props: IListItemProps) => new ListItem(props).element);
    }

    private listItemClickHandler({type, nextIds, img, help, task, id}: IClickHandlerParams): void {
        if (type === 'topic') {
            this.nextIds = [...nextIds];
            this.props.route = Route.TYPES;
        }
        if (type === 'type') {
            this.nextIds = [...nextIds];
            this.props.route = Route.TASKS;

            this.savePageData();
        }
        if (type === 'task') {
            this.previousRoute = Route.TASKS;
            this.props.route = Route.FORM;
            this.props.help = help;
            this.props.img = img;
            this.props.task = task;
            this.props.formType = FormType.task;
            this.props.id = id;
        }

        this.render();
    }

    private submitHandler(data: ISubmitHandlerParams): void {
        let requestBody;
        const {formType, title, task, id, help, embed, fileInput}: ISubmitHandlerParams = data;

        const newData: IRequestData = {
            data: this.props.data
        };

        if (formType === FormType.topic) {
            newData.data.topics.push(
                {
                    title: title.lastChild.value,
                    types: task.lastChild.value
                }
            );
        } else if (formType === FormType.type) {
            newData.data.types.push(
                {
                    title: title.lastChild.value,
                    tasks: task.lastChild.value
                }
            );
        } else {
            const requestBody: ITask = {
                task: task.lastChild.value as string,
                help: help.lastChild.value as string,
                correct: embed.getValue(),
                img: String(fileInput.files[0]),
            };

            if (id) {
                requestBody.id = id;

                newData.data.tasks.forEach((item: ITask) => {
                    if (item.id !== id) return;

                    item = {...requestBody};
                })
            } else {
                newData.data.tasks.push(requestBody);
            }
        }

        // FetchWorker.sendDataToServer(JSON.stringify(newData));
        // this.props.data = newData;
    }
}

export default new App().element;