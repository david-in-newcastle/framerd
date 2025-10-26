
Text deselection warning - good UX, but not blocking.

Progress indicator - polish, but users can live without it.

Picker behind review - functional, can refactor later.

Settings UI - JSON is fine for technical users in v1.

Grouping/filtering - nice feature for v2.

Need to clear old suggestions.

Needs a progress bar or spinner.

Timing output on review (and wallclock time).

* Need to see how many points of suggestion we can get out of GPT
Seems to do about a dozen then give up. Or send less text. Or do it incrementally?
I suppose, if push comes to shove we could do it paragraph by paragraph in the background. 
But this will need a lot of thought.

Could also do with some way of dealing with summary of overview remarks?

Glyphs in messages would be nice.

* Some means of Rejecting suggestions (accept and ignore, are a matter of applying or not applying a fix)
But we need some way of saying: "This is bullshit, because..." And using and keeping these.
If we can't feed these back to the model, and I don't see why not, we should strip them out, or offer to suppress them.
Which suggests some sort of marker [Some review comments have been hidden.]

Custom dictionaries, Not whole things, just some custom spellings.

Curse words allowed [] not allowed [].

Support some measure of vagueness - like: you have tense wobbles here, and here. There are many others.

Perhaps support multiple candidate fixes for some issues. 











