const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const RECAP_PATH = "chrome://recap/content/";
const RECAP_SKIN_PATH = "chrome://recap/skin/";

// Helper function to create XPCOM instances
function CCIN(contractID, interfaceName) {
    return Cc[contractID].createInstance(Ci[interfaceName]);
}

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

var Recap = {}; // New empty extension namespace

//var jsLoader = CCGS("@mozilla.org/moz/jssubscript-loader;1",
//		    "mozIJSSubScriptLoader");

var jsLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci["mozIJSSubScriptLoader"]);

jsLoader.loadSubScript(RECAP_PATH + "common.js", this);
jsLoader.loadSubScript(RECAP_PATH + "RequestObserver.js", Recap);
jsLoader.loadSubScript(RECAP_PATH + "DownloadListener.js", Recap);
jsLoader.loadSubScript(RECAP_PATH + "ContentListener.js", Recap);
jsLoader.loadSubScript(RECAP_PATH + "DocLinkListener.js", Recap);

log("recap.js loaded");

/** RecapService: Turning PACER inside out.
 *    Mostly boilerplate code to set up the new service component.
 */
function RecapService() {
    // constructor
    this.wrappedJSObject = this;
}

RecapService.prototype = {

    initialized: false,
    
    metacache: {"documents": {},"cases": {}},

    getContentListener: function() {
	return Recap.gContentListener;
    },

    _init: function() {
	if(!this.initialized) {
	    var os = CCGS("@mozilla.org/observer-service;1",
			  "nsIObserverService");
	    os.addObserver(this, "xpcom-shutdown", false);
	    os.addObserver(this, "quit-application", false);
	    
	    try {
		alertsService = CCGS("@mozilla.org/alerts-service;1",
				     "nsIAlertsService");
	    } catch (e) {
		log("couldn't start up alert service (are we on OSX without Growl installed?");
	    }
	    
	    Recap.gRequestObserver = new Recap.RequestObserver(this.metacache);
	    Recap.gContentListener = new Recap.ContentListener();
	    
	    this.initialized = true;
	    
	}
    },
	
    _shutdown: function() {
        os.removeObserver(this, "xpcom-shutdown");
	
	if(this.initialized) {
	    Recap.gRequestObserver.unregister();
            Recap.gRequestObserver = null;

	    Recap.gContentListener.unregister();
	    Recap.gContentListener = null;
	}
    },
    
    _quit: function() {
        os.removeObserver(this, "quit-application");
    },
    
    /**
     * Setting up and Registering the extension using XPCOMUtil
     */

    // properties required for XPCOM registration:
    classDescription: "Recap",
    classID:          Components.ID("{2ada744a-7368-4399-9321-f342637bca76}"),
    contractID:       "@cs.princeton.edu/recap;1",
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
					   Ci.nsISupports]),
					 
		 
    /**
     * See nsIObserver
     */
    observe: function Recap_observe(subject, topic, data) {
	var os = CCGS("@mozilla.org/observer-service;1", 
		      "nsIObserverService");
	
	switch (topic) {
	case "app-startup":
	    log("startup observed");
	    this._init();
	    break;
	case "xpcom-shutdown":
	    log("shutdown observed");
	    this._shutdown();
	    break;
	case "quit-application":
	    log("quit observed");
	    this._quit();
	    break;
	}
	
	os = null;
    },
  
    /**
     * See nsIFactory
     */
    //keep _instance and only return one instance of Recap
    _xpcom_factory: {
	_instance: null,
	createInstance: function (outer, iid) {
	    if (outer != null)
		throw Cr.NS_ERROR_NO_AGGREGATION;
	    log("createInstance called");
	    return this._instance == null ? 
  	      this._instance = (new RecapService()).QueryInterface(iid) : 
	      (this._instance).QueryInterface(iid);
	}
    },
		
    _xpcom_categories: [{
	    category: "app-startup",
	    service: true
	}]	
};

function NSGetModule(compMgr, fileSpec) 
    XPCOMUtils.generateModule([RecapService]);
