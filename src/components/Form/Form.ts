import Input from '../Input/Input';
import render from '../../modules/Render';
import Button from '../Button/Button';
import Embed from '../Embed/Embed';

interface IFormProps {
    taskImage?: string;
    help?: string;
    task?: string;
    title?: string
}

class Form {
    public readonly element: HTMLFormElement;

    private props: IFormProps = {};

    private textInputDivs: HTMLElement[] = [];
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

        this.render(...this.createForm());

        this.saveFile = this.saveFile.bind(this);
        this.saveForm = this.saveForm.bind(this);

        this.fileInput = this.fileInputDiv.childNodes[1] as HTMLInputElement;
        this.fileInput.addEventListener('change', this.saveFile);

        this.element.addEventListener('submit', this.saveForm);
    }

    private render(...elements: HTMLElement[]): void {
        render(this.element, ...elements);
    }

    private createForm(): HTMLElement[] {
        this.title = new Input({text: 'Заголовок', value: this.props.title}).element;
        this.task = new Input({text: 'Текст задания', value: this.props.task}).element;
        this.type = new Input({text: 'Тип задания'}).element;
        this.help = new Input({text: 'Подсказка', value: this.props.help}).element;
        this.fileInputDiv = new Input({text: 'Картинка задания', value: this.props.taskImage, type: 'file'}).element;
        this.embed = new Embed();
        this.saveButton = new Button({text: 'Сохранить', type: 'submit'}).element;

        return [this.title, this.task, this.type, this.help, this.fileInputDiv, this.embed.element, this.saveButton];
    }

    private saveFile(): void {
        const file = this.fileInput.files[0];
        const fileReader = new FileReader();

        fileReader.onload = () => this.embed.setBackground(fileReader.result);

        fileReader.readAsDataURL(file);
    }

    private saveForm(e: Event): void {
        e.preventDefault();
        const answer = {
            "id": 1,                                // id уровня
            "task": this.task.lastChild.value,              // задание
            "help": this.help.lastChild.value,              // help
            "result": this.embed.getValue(),            // результат
            "img": this.fileInput.files[0],               // сопутствующая картинка
            "enable": true                          // доступен ли сейчас для пользователя
        };
        console.dir(answer);
    }
}

export default Form;
