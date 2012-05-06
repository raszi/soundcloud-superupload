(function () {
  // this extends the jQuery object
  $.fn.uploader = function _uploader(options, callback) {
    if (!this.is('form[enctype="multipart/form-data"]')) {
      throw '$.uploader() called on an invalid element';
    }

    // default options
    var opts = $.extend({
      param: 'X-Progress-Id',
      refresh: 500
    }, options || {});

    var
      doc = this[0].ownerDocument,
      $form = $(this),
      action = $form.attr('action'),
      target = $form.attr('target'),
      iframeId = $.now();

    // we'll post to this hidden iframe
    //
    // Internet Explorer workaround
    // http://webbugtrack.blogspot.com/2007/10/bug-235-createelement-is-broken-in-ie.html
    var $iframe = ($.browser.msie) ? $('<iframe name="' + iframeId + '"/>')
      : $(doc.createElement('iframe')).attr('name', iframeId);

    $iframe
      .css('display', 'none')
      .appendTo(doc.body);

    function _addProgressId(action, id) {
      var params = {};
      params[opts.param] = id;

      var urlParams = $.param(params);

      return action.concat((action.indexOf('?') === -1) ? '?' : '&', urlParams);
    }

    function _handleChange(event) {
      var
        $input = $(this),
        deferred = $.Deferred(),
        progressId = $.now(),
        newAction = _addProgressId(action, progressId);

      $form
        .attr({
          target: iframeId,
          action: newAction
        })
        .submit();

      // set everything back
      $form.attr({
        target: '',
        action: action
      });

      // cleanup the input field to allow multiple file uploads
      if ($.browser.msie) {
        var $newInput = $input
          .clone()
          .insertBefore($input)
          .on('change', _handleChange);

        $input.remove();

        $input = $newInput;
      } else {
        $input.val('');
      }

      // inform the caller about the new upload
      callback.apply($input[0], [ deferred.promise() ]);

      (function _checkProgress() {
        $.ajax(newAction, { cache: false })

          .done(function _handleDone(result) {
            if (result.done) {
              deferred.resolve();
              return;
            }

            if (deferred.state() === 'pending') {
              deferred.notify(result.percent);

              setTimeout(_checkProgress, opts.refresh);
            }
          })

          .fail(function _handleFail(result) {
            deferred.reject(result);
          });

      }());
    }

    $('input[type="file"]', $form).on('change', _handleChange);
  };

}(jQuery));
