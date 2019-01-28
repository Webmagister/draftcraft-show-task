interface IButtonProps {
    clickHandler?: () => void;
    text: string;
    type?: string;
}

class Button {
    public readonly element: HTMLButtonElement;

    constructor(data: IButtonProps) {
        this.element = document.createElement('button');
        this.element.classList.add('button');

        if (data.type) this.element.setAttribute('type', data.type);

        this.element.appendChild(document.createTextNode(data.text));

        if (data.clickHandler) this.element.addEventListener('click', data.clickHandler, true);
    }
}

export default Button;
