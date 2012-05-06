$(function () {
  var
    doc = document,
    $form = $('form'),
    $submit = $('input[type="submit"]', $form),

    $status = $(doc.createElement('div'))
      .appendTo($('fieldset.file', $form));

  function _getFiles() {
    $.ajax($form.attr('action'), { cache: false })
      .done(function _handleDone(result) {
        $status.empty();

        $(doc.createElement('p'))
          .text('Uploaded file(s):')
          .appendTo($status);

        var $ul = $(doc.createElement('ul'))
          .appendTo($status);

        $.each(result.files, function (i, file) {
          var $li = $(doc.createElement('li'));

          $(doc.createElement('a'))
            .attr('href', file.path)
            .text(file.name + ' (' + file.size + ')')
            .appendTo($li);

          $li.appendTo($ul);
        });
      })

      .fail(function _handleError(error) {
        $status
          .addClass('error')
          .text(error.responseText);
      });
  }

  $form.uploader({}, function (deferred) {
    var 
      $input = $(this).hide(),

      $status = $(doc.createElement('div'))
        .addClass('status')
        .appendTo($input.parent());

      $progress = $(doc.createElement('div'))
        .addClass('progress')
        .appendTo($status);

    deferred
      .progress(function _handleProgress(progress) {
        $submit.attr('disabled', true);

        var percentage = progress * 100;

        $progress
          .text('' + Math.round(percentage) + '%')
          .css('width', '' + percentage + '%');
      })

      .always(function () {
        $input.show();
        $submit.attr('disabled', false);
      })

      .done(function _handleDone() {
        $status.remove();

        _getFiles();
      })

      .fail(function _handleError(error) {
        $progress.remove();

        $status
          .addClass('error')
          .text(error.responseText);
      });
  });
});
