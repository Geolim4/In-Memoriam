export interface ModalOptions {
  confirmCallback?: VoidFunction;
  cancelCallback?: VoidFunction;
  isError?: boolean;
  isLarge?: boolean;
  okLabel?: string;
  cancelLabel?: string;
  onceShown?: VoidFunction;
}
