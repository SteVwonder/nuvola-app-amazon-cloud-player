/*
 * Copyright 2015 Stephen Herbein <stephen272@gmail.com>
 * Copyright 2015 Steffen Coenen <steffen@steffen-coenen.de>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met: 
 * 
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer. 
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

(function(Nuvola)
{

// Translations
var _ = Nuvola.Translate.gettext;
var C_ = Nuvola.Translate.pgettext;

var COUNTRY_VARIANT = "app.country_variant";
var HOME_PAGE = "http://www.amazon.{1}/gp/dmusic/mp3/player";
var COUNTRY_VARIANTS = [
    ["de", C_("Amazon variant", "Germany")],
    ["fr", C_("Amazon variant", "France")],
    ["co.uk", C_("Amazon variant", "United Kingdom")],
    ["com", C_("Amazon variant", "United States")]
];

// Create media player component
var player = Nuvola.$object(Nuvola.MediaPlayer);

// Handy aliases
var PlaybackState = Nuvola.PlaybackState;
var PlayerAction = Nuvola.PlayerAction;

// Create new WebApp prototype
var WebApp = Nuvola.$WebApp();

// Initialization routines
WebApp._onInitWebWorker = function(emitter)
{
    Nuvola.WebApp._onInitWebWorker.call(this, emitter);
    Nuvola.config.setDefault(COUNTRY_VARIANT, "");
    this.state = PlaybackState.UNKNOWN;

    document.addEventListener("DOMContentLoaded", this._onPageReady.bind(this));
    Nuvola.core.connect("InitializationForm", this);
}

// Page is ready for magic
WebApp._onPageReady = function()
{
    // TODO: only set this after the user has logged in
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect("ActionActivated", this);

    // Start update routine
    this.update();
}

WebApp._onInitializationForm = function(emitter, values, entries)
{
    if (!Nuvola.config.hasKey(COUNTRY_VARIANT))
        this.appendPreferences(values, entries);
}

WebApp.appendPreferences = function(values, entries)
{
    values[COUNTRY_VARIANT] = Nuvola.config.get(COUNTRY_VARIANT);
    entries.push(["header", _("Amazon Cloud Player")]);
    entries.push(["label", _("Preferred national variant")]);
    for (var i = 0; i < COUNTRY_VARIANTS.length; i++)
        entries.push(["option", COUNTRY_VARIANT, COUNTRY_VARIANTS[i][0], COUNTRY_VARIANTS[i][1]]);
}


WebApp._onInitAppRunner = function(emitter)
{
    Nuvola.core.connect("InitializationForm", this);
    Nuvola.core.connect("PreferencesForm", this);
}

WebApp._onPreferencesForm = function(emitter, values, entries)
{
    this.appendPreferences(values, entries);
}


WebApp._onHomePageRequest = function(emitter, result)
{
    result.url = Nuvola.format(HOME_PAGE, Nuvola.config.get(COUNTRY_VARIANT));
}

WebApp.getMP3Player = function()
{
    var mp3Player;
    try {
        mp3Player = document.getElementsByClass("dragonfly")[0];
    } catch (e) {
        mp3Player = document;
    }
    return mp3Player;
}

// Extract data from the web page
WebApp.update = function()
{
    var track = {
        title: null,
        artist: null,
        album: null,
        artLocation: null
    }

    var playerRoot = this.getMP3Player();

    try {
        var songDetails = playerRoot.getElementsByClassName("trackInfoContainer")[0];
        track.title = songDetails.getElementsByClassName("trackTitle")[0].textContent;
        track.artist = songDetails.getElementsByClassName("trackArtist")[0].getElementsByTagName("span")[0].textContent;
        track.album = songDetails.getElementsByClassName("trackSourceLink")[0].getElementsByTagName("a")[0].title;

        var albumImage = playerRoot.getElementsByClassName("albumArtWrapper")[0].getElementsByTagName("img")[0];
        track.artLocation = albumImage.src;
    } catch (e) {
        //~ console.log("Failed to get track info");
        //~ console.log(e.message);
    }

    player.setTrack(track);

    var playButton = this._getPlayButton();
    var pauseButton = this._getPauseButton();
    if (pauseButton)
        this.state = PlaybackState.PLAYING;
    else if (playButton)
        this.state = PlaybackState.PAUSED;
    else
        this.state = PlaybackState.UNKNOWN;

    
    player.setPlaybackState(this.state);
    player.setCanPause(!!pauseButton);
    player.setCanPlay(!!playButton);
    player.setCanGoPrev(!!this._getPrevButton);
    player.setCanGoNext(!!this._getNextButton);
    
    // Schedule the next update
    setTimeout(this.update.bind(this), 500);
}

WebApp._getButton = function(selector)
{
    var elm = document.querySelector(selector);
    return elm ? (elm.classList.contains("disabled") ? null : elm) : null;
}

WebApp._getPlayButton = function()
{
    return this._getButton(".playButton.playerIconPlay");
}

WebApp._getPauseButton = function()
{
    return this._getButton(".playButton.playerIconPause");
}

WebApp._getPrevButton = function()
{
    return this._getButton(".previousButton");
}

WebApp._getNextButton = function()
{
    return this._getButton(".nextButton");
}

WebApp._onActionActivated = function(emitter, name, param)
{
    switch (name) {
    /* Base media player actions */
    case PlayerAction.TOGGLE_PLAY:
        var button = this._getPauseButton();
        if (!button)
            button = this._getPlayButton(); 
        if (button)
            Nuvola.clickOnElement(button);
        break;
    case PlayerAction.PLAY:
        var button = this._getPlayButton();
        if (button)
            Nuvola.clickOnElement(button);
        break;
    case PlayerAction.PAUSE:
    case PlayerAction.STOP:
        var button = this._getPauseButton();
        if (button)
            Nuvola.clickOnElement(button);
        break;
    case PlayerAction.PREV_SONG:
        var button = this._getPrevButton();
        if (button)
            Nuvola.clickOnElement(button);
        break;
    case PlayerAction.NEXT_SONG:
        var button = this._getNextButton();
        if (button)
            Nuvola.clickOnElement(button);
        break;
    }
}

WebApp.start();

})(this);  // function(Nuvola)
