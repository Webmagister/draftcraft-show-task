import {IClickHandlerParams} from "../App";

export interface IListItemProps {
    id: number;
    title?: string;
    type: string;
    nextIds?: number[];
    clickHandler: (data: IClickHandlerParams) => void;
    img?: string;
    task?: string;
    help?: string;
}

class ListItem {
    public readonly element: HTMLLIElement;

    private readonly props: IListItemProps;
    private link: HTMLAnchorElement;

    constructor(props: IListItemProps) {
        this.element = document.createElement('li');
        this.element.classList.add('list-item');

        this.props = {...props};

        this.onClick = this.onClick.bind(this);

        this.render();
    }

    private render(): void {
        this.createLink();
        this.link.appendChild(document.createTextNode(this.props.title || this.props.task));
        this.element.appendChild(this.link);
        this.element.addEventListener('click', this.onClick, true);
    }

    private createLink(): void {
        this.link = document.createElement('a');
        this.link.classList.add('link');
    }

    private onClick(): void {
        if (this.props.clickHandler) this.props.clickHandler({...this.props});
    }
}

export default ListItem;
