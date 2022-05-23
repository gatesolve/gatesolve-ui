import React, { useState } from "react";
import type { MouseEventHandler } from "react";

import IconButton from "@material-ui/core/IconButton";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CloseIcon from "@material-ui/icons/Close";

import LocaleSelect from "./LocaleSelect";

export interface HelpControlProps {
  dataTestId?: string;
  initiallyOpen: boolean;
  locale: string;
  onLocaleSelected: (locale: string) => void;
}

const HelpControl: React.FC<HelpControlProps> = ({
  dataTestId,
  initiallyOpen,
  locale,
  onLocaleSelected,
}) => {
  const [enabled, setEnabled] = useState(initiallyOpen);

  const onClick: MouseEventHandler = (event) => {
    event.preventDefault();
    setEnabled(true);
  };

  const ariaLabel =
    locale === "fi" ? "Tietoja palvelusta" : "About the service";
  const buttonClassName = "mapboxgl-ctrl-icon";
  const buttonColor = "#000000";
  return (
    <div
      className="mapboxgl-ctrl mapboxgl-ctrl-group mapboxgl-ctrl-bottom-left"
      style={{ marginBottom: 94 }}
    >
      <button
        type="button"
        className={buttonClassName}
        data-testid={dataTestId}
        aria-label={ariaLabel}
        onContextMenu={(event): void => event.preventDefault()}
        onClick={onClick}
      >
        <span
          className="mapboxgl-ctrl-icon"
          aria-hidden="true"
          style={{ lineHeight: "29px", fontSize: "24px", color: buttonColor }}
        >
          ?
        </span>
      </button>
      <Dialog
        open={enabled}
        fullWidth
        PaperProps={{ style: { height: "100%", overflow: "hidden" } }}
      >
        {enabled && (
          <>
            <DialogTitle>
              {(locale === "fi" && "Tietoja palvelusta") ||
                "About this service"}
              <IconButton
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                }}
                onClick={() => setEnabled(false)}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent
              style={{
                borderTop: "1px solid rgba(0, 0, 0, 0.12)",
                paddingTop: 0,
              }}
            >
              <div style={{ float: "right" }}>
                <LocaleSelect
                  locale={locale}
                  onLocaleSelected={onLocaleSelected}
                />
              </div>
              {locale === "fi" && (
                <>
                  <h3>Tervetuloa käyttämään Gatesolvea!</h3>
                  <p>
                    Gatesolve on opas tavaratoimitusten viimeisille metreille,
                    eli oikean oven löytymistä varten.
                  </p>
                  <p>
                    Kartalla näkyy{" "}
                    <span style={{ color: "#64be14" }}>vihreällä</span>{" "}
                    määränpäät, eli tiedossa olevat ovet ja niiden talonumero-
                    ja rappukirjaintiedot.
                  </p>
                  <p>
                    Kartalla näkyy{" "}
                    <span style={{ color: "#00afff" }}>sinisellä</span>{" "}
                    purkupaikat, esimerkiksi lastausalueita ja
                    pysäköintikieltoalueita.
                  </p>
                  <p>
                    Oranssit painikkeet vievät{" "}
                    <a
                      href="https://app.olmap.org/"
                      style={{ color: "#ff5000" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      OLMap-palvelun
                    </a>{" "}
                    toimintoihin, joilla voit lisätä, korjata ja kommentoida
                    tietoja.
                  </p>
                  <p>
                    Palvelun näyttämät tiedot ovat vain ehdotuksia, eikä niiden
                    luotettavuudesta ja turvallisuudesta voida ottaa vastuuta.
                    Noudata liikennesääntöjä ja varovaisuutta.
                  </p>
                  <h3>Palaute</h3>
                  <p>
                    Voit lähettää palautetta palvelusta sähköpostitse
                    osoitteeseen{" "}
                    <a href="mailto:gatesolve@sproutverse.com">
                      gatesolve@sproutverse.com
                    </a>
                    .
                  </p>
                  <h3>Lisenssit</h3>
                  <p>
                    Toimipistetietojen ja kuvien lähde on{" "}
                    <a
                      href="https://olmap.org/fi/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      OLMap
                    </a>
                    , jonka tiedot on lisensoitu avoimesti{" "}
                    <a
                      href="https://creativecommons.org/publicdomain/zero/1.0/deed.fi"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Creative Commons CC0
                    </a>{" "}
                    -lausumalla.
                  </p>
                  <p>
                    Taustakartan ja osoitehaun lähde on{" "}
                    <a
                      href="https://digitransit.fi/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Digitransit
                    </a>
                    . Aineistojen avoin lisenssi on{" "}
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ODbL &copy; OpenStreetMapin tekijät
                    </a>
                    .
                  </p>
                  <p>
                    Palvelu ja sen toteutuksessa käytetyt ohjelmistokirjastot
                    ovat avointa lähdekoodia:{" "}
                    <a
                      href="https://github.com/gatesolve/gatesolve-ui"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      palvelun lähdekoodi Githubissa
                    </a>{" "}
                    &copy; Sproutverse Oy ja Mistmap Oy.
                  </p>
                </>
              )}
              {locale !== "fi" && (
                <>
                  <h3>Welcome to use Gatesolve!</h3>
                  <p>
                    Gatesolve is your guide to the last meters of goods
                    deliveries, for finding the right door.
                  </p>
                  <p>
                    The map shows in{" "}
                    <span style={{ color: "#64be14" }}>green</span> the
                    destinations such as any doors and their housenumber and
                    unit information.
                  </p>
                  <p>
                    The map shows in{" "}
                    <span style={{ color: "#00afff" }}>blue</span> the places
                    for unloading including loading zones and no-parking zones.
                  </p>
                  <p>
                    Orange buttons take you to{" "}
                    <a
                      href="https://app.olmap.org/"
                      style={{ color: "#ff5000" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      the OLMap service
                    </a>{" "}
                    including functionalities to add, update and comment on the
                    information.
                  </p>
                  <p>
                    All information in the service is provided as suggestions
                    without guarantees of reliability and safety and its use is
                    at your own risk. Observe traffic regulations and caution.
                  </p>
                  <h3>Feedback</h3>
                  <p>
                    Please send any feedback regarding this service via email to{" "}
                    <a href="mailto:gatesolve@sproutverse.com">
                      gatesolve@sproutverse.com
                    </a>
                    .
                  </p>
                  <h3>Licenses</h3>
                  <p>
                    The source of venue information and photos is{" "}
                    <a
                      href="https://olmap.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      OLMap
                    </a>
                    , which licenses its data openly with the{" "}
                    <a
                      href="https://creativecommons.org/publicdomain/zero/1.0/deed"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Creative Commons CC0
                    </a>{" "}
                    dedication.
                  </p>
                  <p>
                    The source of the background map and the address search is{" "}
                    <a
                      href="https://digitransit.fi/en/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Digitransit
                    </a>
                    . The license of this open data is{" "}
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ODbL &copy; OpenStreetMap contributors
                    </a>
                    .
                  </p>
                  <p>
                    The service and software libraries used in its
                    implementation are open source:{" "}
                    <a
                      href="https://github.com/gatesolve/gatesolve-ui"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      the source code of the service in Github
                    </a>{" "}
                    &copy; Sproutverse Ltd and Mistmap Ltd.
                  </p>
                </>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  );
};

export default HelpControl;
