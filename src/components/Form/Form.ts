import Input from '../Input/Input';
import TextArea from '../Textarea/Textarea';
import render from '../../modules/Render';
import Button from '../Button/Button';
import Embed from '../Embed/Embed';
import {ISubmitHandlerParams} from "../App";

export enum FormType {
    topic, type, task
}

interface IFormProps {
    taskImage?: string;
    help?: string;
    task?: string;
    title?: string;
    formType?: FormType;
    id?: number;
    submitHandler?: (data: ISubmitHandlerParams) => void;
}

class Form {
    public readonly element: HTMLFormElement;

    private props: IFormProps;

    private fileInputDiv: HTMLDivElement;
    private fileInput: HTMLInputElement;
    private saveButton: HTMLButtonElement;
    private embed: Embed;
    private title: HTMLDivElement;
    private task: HTMLDivElement;
    private help: HTMLDivElement;
    private type: HTMLDivElement;

    constructor(data: IFormProps) {
        this.element = document.createElement('form');
        this.element.classList.add('form');

        this.props = {...data};

        if (this.props.formType === FormType.topic) {
            this.render(...this.createTopicForm());
        } else if (this.props.formType === FormType.type) {
            this.render(...this.createTypeForm());
        } else {
            this.saveFile = this.saveFile.bind(this);

            this.render(...this.createForm());

            this.fileInput = this.fileInputDiv.childNodes[1] as HTMLInputElement;
            this.fileInput.addEventListener('change', this.saveFile);
        }

        this.sendForm = this.sendForm.bind(this);

        this.element.addEventListener('submit', this.sendForm);
    }

    private render(...elements: HTMLElement[]): void {
        render(this.element, ...elements);
    }

    private createForm(): HTMLElement[] {
        this.task = new TextArea({text: 'Текст задания', value: this.props.task}).element;
        this.type = new Input({text: 'Тип задания'}).element;
        this.help = new Input({text: 'Подсказка', value: this.props.help}).element;
        this.fileInputDiv = new Input({text: 'Картинка задания', value: this.props.taskImage, type: 'file'}).element;
        this.embed = new Embed();
        this.saveButton = new Button({text: 'Сохранить', type: 'submit'}).element;

        return [this.task, this.type, this.help, this.fileInputDiv, this.embed.element, this.saveButton];
    }

    private createTopicForm(): HTMLElement[] {
        this.title = new Input({text: 'Заголовок', value: this.props.title}).element;
        this.type = new Input({text: 'Тип задания'}).element;

        this.saveButton = new Button({text: 'Сохранить', type: 'submit'}).element;

        return [this.title, this.type, this.saveButton];
    }

    private createTypeForm(): HTMLElement[] {
        this.title = new Input({text: 'Заголовок', value: this.props.title}).element;
        this.task = new Input({text: 'Задание'}).element;

        this.saveButton = new Button({text: 'Сохранить', type: 'submit'}).element;

        return [this.title, this.task, this.saveButton];
    }

    private saveFile(): void {
        const file = this.fileInput.files[0];
        const fileReader = new FileReader();

        fileReader.onload = () => this.embed.setBackground(fileReader.result);

        fileReader.readAsDataURL(file);
    }

    private sendForm(e: Event): void {
        e.preventDefault();
        if (this.props.submitHandler) this.props.submitHandler({
            title: this.title,
            task: this.task,
            id: this.props.id,
            help: this.help,
            embed: this.embed,
            fileInput: this.fileInput,
            formType: this.props.formType,
        });
    }
}

export default Form;
