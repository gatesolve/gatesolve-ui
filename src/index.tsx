import React, { Suspense } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import CircularProgress from "@material-ui/core/CircularProgress";
import "./index.css";
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const App = React.lazy(
  () =>
    import(
      /* webpackChunkName: "App" */
      /* webpackPreload: true */
      "./App"
    )
);

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <SnackbarProvider dense maxSnack={3}>
        <Suspense
          fallback={
            <div
              style={{
                width: "100%",
                height: "100%",
                position: "fixed",
                textAlign: "center",
              }}
            >
              <header
                style={{
                  backgroundColor: "#282c34",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "calc(10px + 2vmin)",
                  color: "white",
                  height: "10%",
                }}
              >
                <h2
                  style={{
                    margin: "1.5vh 2vh",
                    fontSize: "4vh",
                  }}
                >
                  Gatesolve
                </h2>
              </header>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress />
              </div>
            </div>
          }
        >
          <App />
        </Suspense>
      </SnackbarProvider>
    </Router>
  </React.StrictMode>,
  document.getElementById("root")
);

serviceWorkerRegistration.register();
