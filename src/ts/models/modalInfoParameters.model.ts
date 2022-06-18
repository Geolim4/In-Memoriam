export interface ModalInfoParameters {
  title: string;
  content: string;
  confirmCallback?: VoidFunction;
  cancelCallback?: VoidFunction;
  isError?: boolean;
  okLabel?: string;
}
