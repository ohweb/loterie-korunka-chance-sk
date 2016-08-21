/*globals window, document, jQuery */

(function ($, window, document) {
  "use strict";


  // init everything
  $(document).on('ready', function () {
    $('.spousta-stastnych-control').each(function (idx, el) {
      SpoustaStastnychControl(el);
    })
  });


  /**
   * @param {HTMLElement} coreElement
   */
  function SpoustaStastnychControl(coreElement) {


    // ========== Definujeme veřejné rozhraní =============================== //
    var publicInterface = {};



    /**
     * Základní URL pro dotazování se Korunky.
     *
     * @type {string}
     */
    var KORUNKA_URL_BASE = 'https://www.ondra.dev2.korunka.eu';



    /**
     * URL Korunka API ze kterého stahujeme aktuální nejvyšší výhry.
     *
     * @type {string}
     */
    var KORUNKA_API_URI = '/api/spousta-stastnych/aktualni-tikety';



    /**
     * Milisec, pro javascriptovy setInterval
     *
     * @type {number}
     */
    var TIMEOUT_INTERVAL = 5 * 1000;



    var SCROLL_DIRECTION_RIGHT = 'right';



    var SCROLL_DIRECTION_LEFT = 'left';



    /**
     * Interval - id intervalu, který se aktuálně stará o olání funkce pro
     * automatické slidování prvků.
     *
     * @type {Number}
     */
    var interval = null;



    /**
     * Pokud je právě aktvní animace, pak je nastaveno na true.
     *
     * @type {boolean}
     */
    var isAnimationRunning = false;



    /**
     * Kontejner komponenty
     *
     * @type {*}
     */
    var $coreElement = $(coreElement);



    /**
     * Kontejner pro jednotlive výhry
     *
     * @type {*}
     */
    var $list = $($(coreElement).find('div.list'));



    /**
     * Element template pro zobrazování výhry.
     *
     * @type {*}
     */
    var $template = $($coreElement.find('.vyhra.template')).first();



    /**
     * Šipka pro posun vlevo.
     *
     * @type {*}
     */
    var $arrowLeft = $($coreElement.find('a.moveLeft'));



    /**
     * Šipka pro posun vpravo.
     *
     * @type {*}
     */
    var $arrowRight = $($coreElement.find('a.moveRight'));



    /**
     * Spouští interval pro automatikcé scrollování prvků.
     * Pokud již interval běží, pak nic nedělá.
     */
    function startInterval() {
      if (interval == null) {
        interval = setInterval(onTimeToScroll, TIMEOUT_INTERVAL);
      }
    }



    /**
     * Zastavuje interval pro automatické scrollování prvků.
     */
    function stopInterval() {
      clearInterval(interval);
      interval = null;
    }



    /**
     * Funkce pro ovládání scrollování.
     *
     * SCROLL direction je opak SWIPE direction
     *
     * @param {string} scrollDirection
     */
    function scroll(scrollDirection) {
      if (isAnimationRunning) {
        return;
      }

      stopInterval();
      isAnimationRunning = true;

      var elementCurrent = $list.find('div:visible');
      var elementNext;
      var hideDirection, showDirection;

      switch (scrollDirection) {
        case SCROLL_DIRECTION_LEFT:
          elementNext = elementCurrent.prev('div.vyhra:hidden');
          if (elementNext.length == 0) {
            elementNext = $list.find('div.vyhra:last-child');
          }
          hideDirection = 'right';
          showDirection = 'left';
          break;
        case SCROLL_DIRECTION_RIGHT:
          elementNext = elementCurrent.next('div.vyhra:hidden');
          if (elementNext.length == 0) {
            elementNext = $list.find('div.vyhra:first-child');
          }
          hideDirection = 'left';
          showDirection = 'right';
          break;
      }

      // necháme zmizet starý element na stranu opačnou SCROLL_DIRECTION
      elementCurrent.toggle({
        effect    : 'slide',
        direction : hideDirection,
        complete  : onOldElementDone
      });

      /**
       * Volá se po skrytí původního elementu.
       * Vezmeme si další element a zobrazíme ho ze strany SCROLL_DIRECTION
       */
      function onOldElementDone() {
        elementNext.toggle({
          effect    : 'slide',
          direction : showDirection,
          complete  : onNewElementDone
        });
      }

      /**
       * Volá se po zobrazení nového elementu
       * Máme hotovo, animace skončila a opět spouštíme auto scroll.
       */
      function onNewElementDone() {
        isAnimationRunning = false;
        startInterval();
      }
    }



    /**
     * Volá Korunka API a načítá z něj aktuální data pro zobrazení.
     */
    function nactiVyhry() {
      $.ajax({
        url         : KORUNKA_URL_BASE + KORUNKA_API_URI,
        type        : 'GET',
        dataType    : 'json',
        crossDomain : true,
        success     : onNacteniVyherUspesne,
        error       : onNacteniVyherNeuspesne
      });
    }



    /**
     * Přidává daný tiket do seznamu tiketů k zobrazení.
     * Najde si template, zkopíruje ji, vyplní a nový element umístí do seznamu.
     *
     * @param {{datum:string, slosovani:string, odkaz:string, vyhra:string, hra:string, mesto:string}} tiket
     */
    function pridejTiketDoSeznamu(tiket) {
      var $tiketElement = $template.clone();
      $tiketElement.removeClass('template');

      $tiketElement.find('span.datum').text(tiket.datum);
      $tiketElement.find('span.slosovani').text(tiket.slosovani);
      $tiketElement.find('a').attr('href', KORUNKA_URL_BASE + tiket.odkaz);
      $tiketElement.find('span.vyhra').text(tiket.vyhra);
      $tiketElement.find('span.hra').text(tiket.hra);
      $tiketElement.find('span.mesto').text(tiket.mesto);

      $list.append($tiketElement);
    }



    // ========== Event handlers ============================================ //


    /**
     * Funkce volaná intervalem.
     */
    function onTimeToScroll() {
      scroll(SCROLL_DIRECTION_RIGHT);
    }



    /**
     * Vyžádá posunutí seznamu vlevo.
     *
     * @return {boolean}
     */
    function onArrowLeftClicked() {
      scroll(SCROLL_DIRECTION_LEFT);
      return false;
    }



    /**
     * Vyžádá posunutí seznamu vpravo.
     *
     * @return {boolean}
     */
    function onArrowRightClicked() {
      scroll(SCROLL_DIRECTION_RIGHT);
      return false;
    }



    /**
     * Stará se o událost, kdy z API Korunky obdržíme čerstvá data o výhrách.
     *
     * @param {{ generatedAt : string , tikety : * }} data
     */
    function onNacteniVyherUspesne(data) {
      $coreElement.attr('data-generated-at', new Date(data.generatedAt * 1000));

      var count = 0;
      $.each(data.tikety, function (idx, tiket) {
        pridejTiketDoSeznamu(tiket);
        count += 1;
      });
      if (count > 0) {
        $coreElement.trigger(
          'vyhry-nacteny',
          { origin : publicInterface }
        );
      }
    }



    /**
     * Stará se o událost, kdy se z API Korunky nepodaří získat data.
     *
     * @param jqXHR
     * @param textStatus
     * @param errorThrown
     */
    function onNacteniVyherNeuspesne(jqXHR, textStatus, errorThrown) {
      console.log(
        'Nepodařilo se načíst čerstvá data o výhrách.',
        textStatus,
        errorThrown
      );
    }



    /**
     * Stará se o událost, kdy jsou všechny aktuální výhry načteny z API Korunky
     * a vloženy do DOMu.
     *
     * @param {*} event
     * @param {*} data
     */
    function onVyhryNacteny(event, data) {

      // zobrazíme si první výhru
      $list.find('div.vyhra').not('.template').first().show();

      // zahájíme rotaci prvků
      startInterval();
    }


    // ========== Initialization ============================================ //


    // nabindujeme si šipky pro posun výher
    $arrowLeft.on('click', onArrowLeftClicked);
    $arrowRight.on('click', onArrowRightClicked);


    // zajistíme si načtení dat do rotátoru
    nactiVyhry();


    // odchytíme událost, kdy jsou načteny všechny výhry a jsou vloženy do DOMu
    $(document).on('vyhry-nacteny', onVyhryNacteny);


    return publicInterface;
  }

}(jQuery, window, document));
