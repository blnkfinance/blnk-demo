"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CustomCoinIcon from "@/components/blnk-icons/custom-coin-icon";
import {
  CRYPTO_CURRENCIES,
  CURRENCY_TO_COUNTRIES_MAP,
  STABLECOINS,
} from "./currency-codes-data";

const loadedFlagImageUrls = new Set<string>();
const failedFlagImageUrls = new Set<string>();

export default function CountryFlag({
  code,
  type,
  size = 16,
}: {
  code: string;
  type: "currency" | "country";
  size?: number;
}) {
  const isCrypto = useMemo(
    () =>
      CRYPTO_CURRENCIES.has(code.toUpperCase()) ||
      STABLECOINS.has(code.toUpperCase()),
    [code]
  );

  const getCountriesFromCurrency = useCallback(
    (currencyCode: string) => {
      const normalizedCurrencyCode = currencyCode.toUpperCase();

      return (
        CURRENCY_TO_COUNTRIES_MAP[
          normalizedCurrencyCode as keyof typeof CURRENCY_TO_COUNTRIES_MAP
        ] || [currencyCode]
      );
    },
    []
  );

  const getImageUrl = useCallback(
    (currencyOrCountryCode: string): string => {
      if (isCrypto) {
        return `https://assets.coincap.io/assets/icons/${currencyOrCountryCode.toLocaleLowerCase()}@2x.png`;
      }

      if (currencyOrCountryCode.toUpperCase() === "EUR") {
        return "/euro.png";
      }

      const countryCode =
        type === "currency"
          ? getCountriesFromCurrency(currencyOrCountryCode)[0].toLowerCase()
          : currencyOrCountryCode.toLowerCase();

      return `https://flagcdn.com/w40/${countryCode}.png`;
    },
    [getCountriesFromCurrency, isCrypto, type]
  );

  const imageUrl = useMemo(
    () => (code ? getImageUrl(code) : ""),
    [code, getImageUrl]
  );

  const [imageError, setImageError] = useState(
    () => imageUrl !== "" && failedFlagImageUrls.has(imageUrl)
  );
  const [imageLoaded, setImageLoaded] = useState(
    () => imageUrl !== "" && loadedFlagImageUrls.has(imageUrl)
  );

  useEffect(() => {
    if (!code || !imageUrl) return;

    if (loadedFlagImageUrls.has(imageUrl)) {
      setImageLoaded(true);
      setImageError(false);
      return;
    }

    if (failedFlagImageUrls.has(imageUrl)) {
      setImageLoaded(false);
      setImageError(true);
      return;
    }

    const img = new Image();
    img.onload = () => {
      loadedFlagImageUrls.add(imageUrl);
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      failedFlagImageUrls.add(imageUrl);
      setImageLoaded(false);
      setImageError(true);
    };
    img.src = imageUrl;

    if (img.complete && img.naturalWidth > 0) {
      loadedFlagImageUrls.add(imageUrl);
      setImageLoaded(true);
      setImageError(false);
    }
  }, [code, imageUrl]);

  if (!code) {
    return <CustomCoinIcon width={size} height={size} />;
  }

  const isEuro = code.toUpperCase() === "EUR";

  return (
    <div className="flex-shrink-0" style={{ width: size, height: size }}>
      {!imageError && imageLoaded ? (
        <div
          className={`h-full w-full bg-center ${
            isEuro ? "rounded-full bg-contain" : "rounded-full bg-cover"
          }`}
          style={{
            backgroundImage: `url(${imageUrl})`,
            backgroundRepeat: "no-repeat",
          }}
        />
      ) : (
        <CustomCoinIcon width={size} height={size} />
      )}
    </div>
  );
}
