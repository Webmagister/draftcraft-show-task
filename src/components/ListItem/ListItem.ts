import {IClickHandlerParams} from "../App";

export interface IListItemProps {
    title: string;
    type: string;
    nextIds?: number[];
    clickHandler?: (data: IClickHandlerParams) => void;
    taskImage?: string;
    task?: string;
    help?: string;
}

class ListItem {
    public readonly element: HTMLLIElement;

    private readonly props: IListItemProps = {
        title: '',
        type: '',
        nextIds: [],
    };

    constructor(props: IListItemProps) {
        this.element = document.createElement('li');
        this.element.classList.add('list-item');

        this.props = {...props};

        this.onClick = this.onClick.bind(this);

        this.render();
    }

    private render(): void {
        this.element.appendChild(document.createTextNode(this.props.title));
        this.element.addEventListener('click', this.onClick, true);
    }

    private onClick(): void {
        if (this.props.clickHandler) this.props.clickHandler({...this.props});
    }
}

export default ListItem;
