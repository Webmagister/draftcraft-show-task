class Iframe {
    public readonly element: HTMLDivElement;
    private area: any;

    constructor() {
        this.element = document.createElement('div');
        this.element.setAttribute('id', 'drawable-area');
        this.element.classList.add('embed');

        this.area = new DrawableArea(this.element);
    }

    public setBackground(background: string | ArrayBuffer) {
        this.area.setBackground(background);
    }

    public getValue(): string {
        return this.area.getValue();
    }
}

export default Iframe;
