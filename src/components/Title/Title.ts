class Title {
    public readonly element: HTMLHeadingElement;

    constructor(text: string) {
        this.element = document.createElement('h1');
        this.element.classList.add('title');

        this.element.appendChild(document.createTextNode(text));
    }
}

export default Title;
