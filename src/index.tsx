import React, { Suspense } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router } from "react-router-dom";
import { SnackbarProvider } from "notistack";
import { CircularProgress } from "@material-ui/core";
import "./index.css";
import * as serviceWorker from "./serviceWorker";

const App = React.lazy(() =>
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress />
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

serviceWorker.register();
