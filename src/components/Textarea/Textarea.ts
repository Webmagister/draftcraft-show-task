class Textarea {
    public readonly element: HTMLDivElement;

    private textarea: HTMLTextAreaElement;

    constructor(text: string) {
        this.element = document.createElement('div');
        this.element.classList.add('cell');

        this.createTextarea(text);

        this.element.appendChild(this.textarea);
    }

    private createTextarea(text: string): void {
        this.textarea = document.createElement('textarea');
        this.textarea.classList.add('textarea');
        this.textarea.appendChild(document.createTextNode(text));
    }
}

export default Textarea;
