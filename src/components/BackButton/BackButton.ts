class BackButton {
    public readonly element: HTMLButtonElement;

    private imagePath: string = "images/left-arrow.png";
    private image: HTMLImageElement;

    constructor(clickHandler: () => void) {
        this.element = document.createElement('button');
        this.element.classList.add('backButton');

        this.createBackButton();

        this.element.appendChild(this.image);

        this.element.addEventListener('click', clickHandler);
    }

    private createBackButton(): void {
        this.image = document.createElement('img');
        this.image.setAttribute('src', this.imagePath);
        this.image.classList.add('backImage');
    }
}

export default BackButton;
