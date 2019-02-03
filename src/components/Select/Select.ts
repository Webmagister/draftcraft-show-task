import {ITask, IType} from "../App";

interface IOption {
    id?: number;
    title?: string;
}

class Select {
    public readonly element: HTMLDivElement;

    private select: HTMLSelectElement;
    private label: HTMLLabelElement;

    constructor(data: { text: string, option?: IOption[] }) {
        this.element = document.createElement('div');
        this.element.classList.add('cell');

        this.createOption = this.createOption.bind(this);

        this.createSelect();
        data.option.forEach(this.createOption);
        this.createLabel(data.text);

        this.element.appendChild(this.label);
        this.element.appendChild(this.select);
    }

    private createSelect(): void {
        this.select = document.createElement('select');
        this.select.classList.add('select');

        this.select.setAttribute('multiple', 'multiple');
        this.select.setAttribute('required', 'required');
    }

    private createLabel(text: string): void {
        this.label = document.createElement('label');
        this.label.classList.add('label');
        this.label.appendChild(document.createTextNode(text));
    }

    private createOption(currElem: IOption): void {
        const option: HTMLOptionElement = document.createElement('option');
        option.setAttribute('value', currElem.id.toString());
        if (currElem.title)
        {
            option.appendChild(document.createTextNode(currElem.title))
        }
        else
        {
            option.appendChild(document.createTextNode('100000'))
        }

        this.select.appendChild(option);
    }
}

export default Select;
