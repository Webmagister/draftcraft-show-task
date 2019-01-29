class Input {
    public readonly element: HTMLDivElement;

    private input: HTMLInputElement;
    private label: HTMLLabelElement;

    constructor(data : {text: string, value?: string, type?: string }) {
        this.element = document.createElement('div');
        this.element.classList.add('cell');

        this.createInput(data.value, data.type);
        this.createLabel(data.text);

        this.element.appendChild(this.label);
        this.element.appendChild(this.input);
    }

    private createInput(value?: string, type?: string): void {
        this.input = document.createElement('input');
        this.input.classList.add('input');

        if (value) this.input.setAttribute('value', value);
        if (type) this.input.setAttribute('type', type);
    }

    private createLabel(text: string): void {
        this.label = document.createElement('label');
        this.label.classList.add('label');
        this.label.appendChild(document.createTextNode(text));
    }
}

export default Input;
