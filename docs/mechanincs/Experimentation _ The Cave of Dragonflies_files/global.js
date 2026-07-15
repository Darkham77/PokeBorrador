window.onload = global_setup;

function global_setup() {
   var kruvmbulasmiklubb = document.getElementById("last");
   kruvmbulasmiklubb.onclick = redirect;

   function redirect() {
      window.location = "/kruvmbulasmiklubb.htm";
   }

   var links = document.getElementById("content").getElementsByTagName("a");

   for (var i = 0; i < links.length; i++) {
      if (links[i].className === "footnote-anchor") {
        links[i].onclick = showFootnote;
      }
   }

   function showFootnote(event) {
      event.preventDefault();

      var footnote = document.getElementById(this.href.split("#")[1]);
      var isVisible = footnote.className === "footnote active";

      // Hide any currently active footnotes.
      // if (document.getElementsByClassName) {
      //    var footnotes = document.getElementsByClassName("footnote active");
      //    for (var i = 0; i < footnotes.length; i++) {
      //       footnotes[i].className = "footnote";
      //    }
      // }

      if (!isVisible) {
         footnote.className += " active";
      }
      else {
         footnote.className = "footnote";
      }
      return false;
   }
}