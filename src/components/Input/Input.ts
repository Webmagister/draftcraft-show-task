class Input {
    public readonly element: HTMLDivElement;

    private input: HTMLInputElement;
    private label: HTMLLabelElement;

    constructor(text: string, value?: string) {
        this.element = document.createElement('div');
        this.element.classList.add('cell');

        this.createInput(value);
        this.createLabel(text);

        this.element.appendChild(this.label);
        this.element.appendChild(this.input);
    }

    private createInput(value?: string): void {
        this.input = document.createElement('input');
        this.input.classList.add('input');

        if (value) this.input.setAttribute('value', value);
    }

    private createLabel(text: string): void {
        this.label = document.createElement('label');
        this.label.classList.add('label');
        this.label.appendChild(document.createTextNode(text));
    }
}

export default Input;
