export {};

// Minimal ambient typing for the global `CustomElement` object injected by
// https://app.kontent.ai/js-api/custom-element/v1/custom-element.min.js (loaded in index.html).
// See https://kontent.ai/learn/docs/apis/custom-elements-js-api for the full API surface.
declare global {
  type ItemChangedDetails = Readonly<{
    codename: string;
    name: string;
    collection: Readonly<{ id: string }>;
  }>;

  type CustomElementInitData = Readonly<{
    value: string | null;
    disabled: boolean;
  }>;

  type CustomElementInitContext = Readonly<{
    projectId: string;
    item: Readonly<{ id: string }> & ItemChangedDetails;
    variant: Readonly<{ id: string; codename: string }>;
  }>;

  const CustomElement: Readonly<{
    init: (callback: (element: CustomElementInitData, context: CustomElementInitContext) => void) => void;
    setValue: (value: string | null) => void;
    setHeight: (height: number) => void;
    onDisabledChanged: (callback: (disabled: boolean) => void) => void;
    observeItemChanges: (callback: (item: ItemChangedDetails) => void) => void;
  }>;
}
