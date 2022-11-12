// go build -o proxy main.go && ./proxy

package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"syscall"
	"runtime"
)

/*
	Utilities
*/

// Get env var or default
func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

/*
	Getters
*/

// Get the port to listen on
func getListenAddress() string {
	port := getEnv("PORT", "8080")
	return ":" + port
}

/*
	Reverse Proxy Logic
*/

// Serve a reverse proxy for a given url
func serveReverseProxy(host string, target string, res http.ResponseWriter, req *http.Request) {
	// parse the url
	url, _ := url.Parse("http://"+ host + target)
  log.Printf("Proxy %s%s => %s\n", req.Host, req.URL, url)
  
  proxyhost, _ := url.Parse("http://"+ host)

	// create the reverse proxy
	proxy := httputil.NewSingleHostReverseProxy(proxyhost)

  req.URL = url
	// Update the headers to allow for SSL redirection
	// req.URL.Host = url.Host
	// req.URL.Scheme = url.Scheme
	req.Header.Set("X-Forwarded-Host", req.Header.Get("Host"))
  req.Header.Set("Host", host)
	req.Host = url.Host
  
  // You can optionally capture/wrap the transport if that's necessary (for
  // instance, if the transport has been replaced by middleware). Example:
  // proxy.Transport = &myTransport{proxy.Transport}
  proxy.Transport = &myTransport{}
    
	// Note that ServeHttp is non blocking and uses a go routine under the hood
	proxy.ServeHTTP(res, req)
  
}

type myTransport struct {
    // Uncomment this if you want to capture the transport
    // CapturedTransport http.RoundTripper
}

func (t *myTransport) RoundTrip(request *http.Request) (*http.Response, error) {
    response, err := http.DefaultTransport.RoundTrip(request)
    // or, if you captured the transport
    // response, err := t.CapturedTransport.RoundTrip(request)
    
    // log.Println("Header ---------- BEGIN")
    // // Loop over header names
    // for name, values := range response.Header {
    //   // Loop over all values for the name.
    //   for _, value := range values {
    //     log.Println(name, value)
    //   }
    // }
    // log.Println("Header ---------- END")
    log.Printf("Status %d %s", response.StatusCode, http.StatusText(response.StatusCode))
    
    log.Printf("add Header: Access-Control-Allow-Origin: * \n")
    response.Header.Add("Access-Control-Allow-Origin", "*")

    // The httputil package provides a DumpResponse() func that will copy the
    // contents of the body into a []byte and return it. It also wraps it in an
    // ioutil.NopCloser and sets up the response to be passed on to the client.
    // body, err := httputil.DumpResponse(response, false)
    // if err != nil {
    //     // copying the response body did not work
    //     return nil, err
    // }

    // You may want to check the Content-Type header to decide how to deal with
    // the body. In this case, we're assuming it's text.
    // log.Printf("Header:\n%s", body)
    
    // log.Printf("Header = %s\n", string(response.Header))
    
    return response, err
}

// Given a request send it to the appropriate url
func handleRequestAndRedirect(res http.ResponseWriter, req *http.Request) {
  redirect := strings.SplitN(req.URL.String(), "/", 3)
  host := redirect[1]
  url := "/"+ redirect[2]
  
	serveReverseProxy(host, url, res, req)
}

/*
	Entry
*/

func main() {
  log.Printf("Start proxy on localhost%s\n", getListenAddress())

	
	argLength := len(os.Args[1:])
	if argLength > 0 && os.Args[1] == "-d" {
		log.Printf("running in background as daemon")
		darwin := runtime.GOOS == "darwin"
		id,ret2, _ := syscall.Syscall(syscall.SYS_FORK, 0, 0, 0)
		// handle exception for darwin
    if darwin && ret2 == 1 {
            id = 0
    }
    if id == 0 {
        log.Println("In child:", id)
				// start server in child
				http.HandleFunc("/", handleRequestAndRedirect)
				if err := http.ListenAndServe(getListenAddress(), nil); err != nil {
					panic(err)
				}
    } else {
        log.Println("In parent:", id)
    }
	} else {
		log.Printf("Note: use -d to run in background as daemon. Set PORT variable for other listening port.")
		// start server in foreground
		http.HandleFunc("/", handleRequestAndRedirect)
		if err := http.ListenAndServe(getListenAddress(), nil); err != nil {
			panic(err)
		}
	}
}
