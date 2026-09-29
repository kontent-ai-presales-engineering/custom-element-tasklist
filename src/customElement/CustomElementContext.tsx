import React, { ReactNode, useContext, useEffect, useMemo, useState } from "react";

// hooks are only ever used in the react tree so this is fine
/* eslint-disable react-refresh/only-export-components */
export const useValue = () => [useContext(Context).value, useContext(Context).setValue] as const;

export const useIsDisabled = () => useContext(Context).isDisabled;

export const useConfig = () => useContext(Context).config;

export const useEnvironmentId = () => useContext(Context).environmentId;

export const useItemInfo = () => useContext(Context).item;

export const useVariantInfo = () => useContext(Context).variant;
/* eslint-enable react-refresh/only-export-components */

type ItemInfo = Readonly<{
  id: string;
}> & ItemChangedDetails;

type CustomElementContextValue = Readonly<{
  // The raw stored value; the task list and the publish gate each interpret it their own way.
  value: string | null;
  setValue: (newValue: string | null) => void;
  isDisabled: boolean;
  config: Readonly<Record<string, unknown>> | null;
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
  const [value, setValue] = useState<string | null | typeof specialMissingValue>(specialMissingValue);
  const [config, setConfig] = useState<Readonly<Record<string, unknown>> | null>(null);
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  const [item, setItem] = useState<ItemInfo | null>(null);
  const [variant, setVariant] = useState<Readonly<{ id: string; codename: string }> | null>(null);

  const context = useMemo<CustomElementContextValue | null>(() => {
    if (value === specialMissingValue || !environmentId || !item || !variant) {
      return null;
    }
    return {
      value,
      // Anything other than `null` counts as a filled-in value for Kontent.ai's "Required" validation.
      setValue: (newValue: string | null) => {
        CustomElement.setValue(newValue);
        setValue(newValue);
      },
      isDisabled,
      config,
      environmentId,
      item,
      variant,
    };
  }, [value, isDisabled, config, environmentId, item, variant]);

  useEffect(() => {
    CustomElement.init((element, ctx) => {
      setValue(element.value);
      setIsDisabled(element.disabled);
      setConfig(element.config);
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

  useDynamicHeight(props.height === "dynamic");

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
  config: null,
  setValue: () => { },
});

// Follows the rendered content's size rather than the value, since the UI can grow without the
// value changing (e.g. expanding the task history, or the gate reacting to another element).
const useDynamicHeight = (isEnabled: boolean) => {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const update = () => CustomElement.setHeight(Math.ceil(Math.max(document.documentElement.offsetHeight, 50)));
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    update();

    return () => observer.disconnect();
  }, [isEnabled]);
};

const specialMissingValue = "This value is special and indicates that a value is missing. This allows having undefined and null as valid values." as const;
