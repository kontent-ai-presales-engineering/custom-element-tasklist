import React, { ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Value, parseValue } from "./value";

// hooks are only ever used in the react tree so this is fine
/* eslint-disable react-refresh/only-export-components */
export const useValue = () => [useContext(Context).value, useContext(Context).setValue] as const;

export const useIsDisabled = () => useContext(Context).isDisabled;

export const useEnvironmentId = () => useContext(Context).environmentId;

export const useItemInfo = () => useContext(Context).item;

export const useVariantInfo = () => useContext(Context).variant;
/* eslint-enable react-refresh/only-export-components */

type ItemInfo = Readonly<{
  id: string;
}> & ItemChangedDetails;

type CustomElementContextValue = Readonly<{
  value: Value | null;
  setValue: (newValue: Value | null) => void;
  isDisabled: boolean;
  environmentId: string;
  item: ItemInfo;
  variant: Readonly<{
    id: string;
    codename: string;
  }>;
}>;

type CustomElementContextProps = Readonly<{
  height?: number | "default" | "dynamic";
  children: ReactNode;
}>;

export const CustomElementContext = (props: CustomElementContextProps) => {
  const [isDisabled, setIsDisabled] = useState(false);
  const [value, setValue] = useState<Value | null | typeof specialMissingValue>(specialMissingValue);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [item, setItem] = useState<ItemInfo | null>(null);
  const [variant, setVariant] = useState<Readonly<{ id: string; codename: string }> | null>(null);

  const context = useMemo<CustomElementContextValue | null>(() => {
    if (value === specialMissingValue || !environmentId || !item || !variant) {
      return null;
    }
    return {
      value,
      // Anything other than `null` counts as a filled-in value for Kontent.ai's "Required"
      // validation, so callers decide what to pass in based on whether the checklist is done.
      setValue: (newValue: Value | null) => {
        CustomElement.setValue(newValue === null ? null : JSON.stringify(newValue));
        setValue(newValue);
      },
      isDisabled,
      environmentId,
      item,
      variant,
    };
  }, [value, isDisabled, environmentId, item, variant]);

  useEffect(() => {
    CustomElement.init((element, ctx) => {
      const parsedValue = parseValue(element.value);
      if (parsedValue === "invalidValue") {
        console.warn(`Custom element received invalid value "${element.value}". Treating it as a missing value.`);
      }

      setValue(parsedValue === "invalidValue" ? null : parsedValue);
      setIsDisabled(element.disabled);
      setEnvironmentId(ctx.projectId);
      setItem(ctx.item);
      setVariant(ctx.variant);
    });
  }, []);

  useEffect(() => {
    CustomElement.observeItemChanges(i => setItem(prev => prev && ({ ...prev, ...i })));
  }, []);

  useEffect(() => {
    CustomElement.onDisabledChanged(setIsDisabled);
  }, []);

  useDynamicHeight(props.height === "dynamic", value);

  useEffect(() => {
    if (typeof props.height === "number") {
      CustomElement.setHeight(props.height);
    }
  }, [props.height]);

  if (!context) {
    return <p>Loading…</p>;
  }

  return (
    <Context.Provider value={context}>
      {props.children}
    </Context.Provider>
  );
};

CustomElementContext.displayName = "CustomElementContext";

const Context = React.createContext<CustomElementContextValue>({
  value: null,
  variant: { id: "", codename: "" },
  item: {
    id: "",
    codename: "",
    name: "",
    collection: { id: "" },
  },
  environmentId: "",
  isDisabled: true,
  setValue: () => { },
});

const useDynamicHeight = (isEnabled: boolean, value: Value | null | typeof specialMissingValue) => {
  useLayoutEffect(() => {
    if (!isEnabled) {
      return;
    }
    const newSize = Math.max(document.documentElement.offsetHeight, 100);

    CustomElement.setHeight(Math.ceil(newSize));
  }, [value, isEnabled]); // recalculate the size when value changes
};

const specialMissingValue = "This value is special and indicates that a value is missing. This allows having undefined and null as valid values." as const;
