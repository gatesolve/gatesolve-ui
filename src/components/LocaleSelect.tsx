import React from "react";
import NativeSelect from "@material-ui/core/NativeSelect";

const localesAvailable =
  "English|en,Finnish|fi,Swedish|sv,Afrikaans|af,Albanian|sq,Amharic|am,Arabic|ar,Armenian|hy,Azerbaijani|az,Basque|eu,Belarusian|be,Bengali|bn,Bosnian|bs,Bulgarian|bg,Catalan|ca,Cebuano|ceb,Chinese (Simplified)|zh-CN,Chinese (Traditional)|zh-TW,Corsican|co,Croatian|hr,Czech|cs,Danish|da,Dutch|nl,Esperanto|eo,Estonian|et,French|fr,Frisian|fy,Galician|gl,Georgian|ka,German|de,Greek|el,Gujarati|gu,Haitian Creole|ht,Hausa|ha,Hawaiian|haw,Hebrew|he,Hindi|hi,Hmong|hmn,Hungarian|hu,Icelandic|is,Igbo|ig,Indonesian|id,Irish|ga,Italian|it,Japanese|ja,Javanese|jv,Kannada|kn,Kazakh|kk,Khmer|km,Kinyarwanda|rw,Korean|ko,Kurdish|ku,Kyrgyz|ky,Lao|lo,Latvian|lv,Lithuanian|lt,Luxembourgish|lb,Macedonian|mk,Malagasy|mg,Malay|ms,Malayalam|ml,Maltese|mt,Maori|mi,Marathi|mr,Mongolian|mn,Myanmar (Burmese)|my,Nepali|ne,Norwegian|no,Nyanja (Chichewa)|ny,Odia (Oriya)|or,Pashto|ps,Persian|fa,Polish|pl,Portuguese (Portugal, Brazil)|pt,Punjabi|pa,Romanian|ro,Russian|ru,Samoan|sm,Scots Gaelic|gd,Serbian|sr,Sesotho|st,Shona|sn,Sindhi|sd,Sinhala (Sinhalese)|si,Slovak|sk,Slovenian|sl,Somali|so,Spanish|es,Sundanese|su,Swahili|sw,Tagalog (Filipino)|tl,Tajik|tg,Tamil|ta,Tatar|tt,Telugu|te,Thai|th,Turkish|tr,Turkmen|tk,Ukrainian|uk,Urdu|ur,Uyghur|ug,Uzbek|uz,Vietnamese|vi,Welsh|cy,Xhosa|xh,Yiddish|yi,Yoruba|yo,Zulu|zu"
    .split(",")
    .map((entry) => entry.split("|"));

interface LocaleSelectProps {
  locale: string;
  onLocaleSelected: (locale: string) => void;
}

const LocaleSelect: React.FC<LocaleSelectProps> = ({
  locale,
  onLocaleSelected,
}) => {
  return (
    <NativeSelect
      inputProps={{
        id: "locale",
        name: "locale",
      }}
      onChange={(event) => {
        const selectedLocale = event.target.value;
        if (selectedLocale !== locale) {
          onLocaleSelected(selectedLocale);
        }
      }}
      style={{ paddingTop: 0, maxWidth: 90 }}
    >
      <option key="" value="" selected={locale === ""}>
        {locale === "" ? "Translate" : "Original"}
      </option>
      {localesAvailable.map(([name, code]) => (
        <option key={code} value={code} selected={locale === code}>
          {name}
        </option>
      ))}
    </NativeSelect>
  );
};
export default LocaleSelect;
