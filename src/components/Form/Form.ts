import Input from '../Input/Input';
import render from '../../modules/Render';
import Button from '../Button/Button';

interface IFormProps {
    taskImage?: string;
    help?: string;
    task?: string;
    title?: string
}

class Form {
    public readonly element: HTMLFormElement;

    private props: IFormProps = {};

    constructor(data: IFormProps) {
        this.element = document.createElement('form');
        this.element.classList.add('form');

        this.props = {...data};

        this.render(...this.createForm());
    }

    private render(...elements: HTMLElement[]): void {
        render(this.element, ...elements);
    }

    private createForm(): HTMLElement[] {
        const array: HTMLElement[] = [];

        array.push(new Input('Заголовок', this.props.title).element);
        array.push(new Input('Текст задания', this.props.task).element);
        array.push(new Input('Тип задания').element);
        array.push(new Input('Подсказка', this.props.help).element);
        array.push(new Input('Картинка задания', this.props.taskImage).element);

        array.push(new Button({text: 'Сохранить', type: 'submit'}).element);

        return array;
    }

    private save(): void {

    }
}

export default Form;
