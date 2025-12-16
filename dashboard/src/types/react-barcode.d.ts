declare module 'react-barcode' {
  import { ComponentType } from 'react';

  interface BarcodeProps {
    value: string;
    format?: 
      | 'CODE128' 
      | 'CODE128A' 
      | 'CODE128B' 
      | 'CODE128C'
      | 'EAN13' 
      | 'EAN8' 
      | 'EAN5' 
      | 'EAN2'
      | 'UPC' 
      | 'UPCE'
      | 'CODE39'
      | 'ITF14'
      | 'ITF'
      | 'MSI' 
      | 'MSI10' 
      | 'MSI11' 
      | 'MSI1010' 
      | 'MSI1110'
      | 'pharmacode'
      | 'codabar';
    width?: number;
    height?: number;
    displayValue?: boolean;
    text?: string;
    fontOptions?: string;
    font?: string;
    textAlign?: 'left' | 'center' | 'right';
    textPosition?: 'top' | 'bottom';
    textMargin?: number;
    fontSize?: number;
    background?: string;
    lineColor?: string;
    margin?: number;
    marginTop?: number;
    marginBottom?: number;
    marginLeft?: number;
    marginRight?: number;
    flat?: boolean;
    ean128?: boolean;
  }

  const Barcode: ComponentType<BarcodeProps>;
  export default Barcode;
}
