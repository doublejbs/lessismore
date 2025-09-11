declare global {
  namespace google {
    namespace maps {
      namespace marker {
        class AdvancedMarkerElement {
          constructor(options?: AdvancedMarkerElementOptions);
          position: LatLng | LatLngLiteral | null;
          map: Map | null;
        }

        interface AdvancedMarkerElementOptions {
          position?: LatLng | LatLngLiteral;
          map?: Map;
          title?: string;
          content?: HTMLElement;
        }
      }

      namespace places {
        class PlaceAutocompleteElement extends HTMLElement {
          constructor(options?: any);

          addEventListener(
            type: string,
            listener: (event: any) => void,
            options?: boolean | AddEventListenerOptions
          ): void;

          removeEventListener(
            type: string,
            listener: (event: any) => void,
            options?: boolean | EventListenerOptions
          ): void;

          setAttribute(name: string, value: string): void;
          style: CSSStyleDeclaration;
        }

        interface PlaceAutocompleteElementOptions {
          locationRestriction?: any;
          componentRestrictions?: any;
          types?: string[];
        }

        interface Place {
          geometry?: {
            location?: {
              lat(): number;
              lng(): number;
            };
          };
          name?: string;
          formatted_address?: string;
          fetchFields(options: { fields: string[] }): Promise<void>;
        }
      }
    }
  }
}

export {};
