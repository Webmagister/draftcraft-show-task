class Iframe {
    public readonly element: HTMLIFrameElement;

    constructor() {
        this.element = document.createElement('iframe');
        this.element.classList.add('embed');
        this.element.setAttribute('src', 'external/example.html');
        this.element.setAttribute('type', 'text/html');
        this.element.setAttribute('name', 'draw');
    }

    public setBackground(background: string | ArrayBuffer) {
        this.element.contentWindow.area.setBackground(background);
    }

    public getValue(): string {
        return this.element.contentWindow.area.getValue();
    }
}

export default Iframe;
