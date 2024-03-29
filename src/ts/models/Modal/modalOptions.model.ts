export interface ModalOptions {
    confirmButtonColor?: 'danger'|'warning'|'primary'|'';
    cancelButtonColor?: 'danger'|'warning'|'primary'|'';
    confirmCallback?: VoidFunction;
    cancelCallback?: VoidFunction;
    requiresExplicitCancel?: boolean;
    nl2brContent?: boolean;
    markdownContent?: boolean;
    noStacking?: boolean;
    escapeContent?: boolean;
    isError?: boolean;
    isLarge?: boolean;
    okLabel?: string;
    cancelLabel?: string;
    onceShown?: VoidFunction;
}
