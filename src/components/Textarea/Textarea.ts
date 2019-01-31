class Textarea {
    public readonly element: HTMLDivElement;

    private textarea: HTMLTextAreaElement;
    private label: HTMLLabelElement;

    constructor(data : {text: string, value?: string, type?: string }) {
        this.element = document.createElement('div');
        this.element.classList.add('cell');

        this.createTextarea(data.value);
        this.createLabel(data.text);

        this.element.appendChild(this.label);
        this.element.appendChild(this.textarea);
    }

    private createTextarea(value?: string): void {
        this.textarea = document.createElement('textarea');
        this.textarea.classList.add('textarea');
        this.textarea.appendChild(document.createTextNode(value));
    }

    private createLabel(text: string): void {
        this.label = document.createElement('label');
        this.label.classList.add('label');
        this.label.appendChild(document.createTextNode(text));
    }
}

export default Textarea;
