---

name: effective-research
description: Conducts rigorous, reproducible research from question definition through source discovery, evidence evaluation, contradiction analysis, synthesis, citation verification, and final reporting. Use for deep research, literature reviews, technical investigations, fact-checking, comparative analysis, high-stakes questions, or any task requiring conclusions grounded in multiple credible sources.
---

# Good Research Framework

Use this workflow to produce research that is traceable, balanced, reproducible, and proportional to the strength of the available evidence.

## Core Principles

Always:

* Define the question before searching.
* Prefer primary and authoritative sources.
* Distinguish facts, claims, interpretations, assumptions, and inferences.
* Trace important claims to their original evidence.
* Search for contradictory evidence, not only supporting evidence.
* Treat repeated reporting of one source as one evidence chain.
* State uncertainty and limitations explicitly.
* Never fabricate citations, quotations, statistics, or source contents.
* Match the confidence of the conclusion to the quality of the evidence.

Do not optimize for the largest number of sources. Optimize for the strongest defensible answer.

## 1. Define the Research Scope

Before searching, convert the request into a bounded research problem.

### Required actions

1. State the primary research question in one sentence.
2. Break it into supporting questions.
3. Identify:

   * Relevant entities, populations, products, systems, or industries.
   * Geographic scope.
   * Time range.
   * Required technical depth.
   * Intended audience.
   * Required output format.
   * Important exclusions.
4. Define ambiguous terms.
5. Identify assumptions that could affect the result.
6. Establish completion criteria.

### Research brief

Create an internal research brief containing:

```markdown
## Research Brief

Primary question:

Supporting questions:
1.
2.
3.

Scope:
- Entities:
- Geography:
- Time range:
- Technical depth:

Exclusions:

Definitions:

Assumptions:

Audience:

Output format:

Completion criteria:
```

### Scope rule

Do not begin broad information gathering until the question is specific enough to determine whether a source is relevant.

When the user’s request lacks minor details, make reasonable assumptions and state them. Ask for clarification only when different interpretations would materially change the research.

## 2. Formulate the Search Strategy

Translate the research brief into a structured discovery plan.

### Build a concept map

For each major concept, identify:

* Exact terminology.
* Synonyms.
* Alternative spellings.
* Acronyms.
* Technical terminology.
* Historical terminology.
* Related organizations, authors, standards, products, or datasets.
* Terms associated with criticism or opposing viewpoints.

Example:

```markdown
| Concept | Primary terms | Synonyms | Related terms | Exclusions |
|---|---|---|---|---|
| Main concept | | | | |
```

### Create multiple query types

Use several kinds of searches rather than relying on one query.

#### Discovery queries

Use broad queries to understand terminology, major participants, and the shape of the field.

#### Precision queries

Use exact phrases, names, dates, standards, identifiers, and technical terms to verify specific claims.

#### Primary-source queries

Target:

* Official documentation.
* Original studies.
* Government publications.
* Laws and regulations.
* Standards.
* Regulatory filings.
* Public datasets.
* Court records.
* Company filings.
* Conference papers.
* Source-code repositories.

#### Contradiction queries

Explicitly search for:

* Criticism.
* Limitations.
* Retractions.
* Corrections.
* Failed replications.
* Counterevidence.
* Alternative explanations.
* Security advisories.
* Reported failures.
* Disputed claims.

Example patterns:

```text
"<claim>" criticism
"<study>" replication
"<product>" limitations
"<organization>" correction
"<method>" failure
"<topic>" counterevidence
```

#### Recency queries

For current topics, search specifically for:

* Recent announcements.
* Current documentation.
* Latest releases.
* Policy changes.
* Recent datasets.
* Corrections or updates.

Distinguish the publication date from the date the underlying event or data occurred.

### Query construction

Use supported search operators where useful:

```text
("primary term" OR "synonym") AND ("secondary concept" OR alternative)
```

Additional operators may include:

```text
"exact phrase"
site:example.org
filetype:pdf
after:YYYY-MM-DD
before:YYYY-MM-DD
-term-to-exclude
```

Do not create overly complex Boolean queries when several focused searches would produce clearer results.

### Source map

Choose source categories appropriate to the subject.

Potential source categories include:

1. Original datasets, laws, standards, records, and official documentation.
2. Peer-reviewed primary research.
3. Systematic reviews and meta-analyses.
4. Government and institutional reports.
5. Technical specifications and official repositories.
6. Regulatory filings and court records.
7. Reputable specialist or investigative journalism.
8. Expert commentary and secondary analysis.
9. Community discussions and firsthand reports.

Community content may provide leads or evidence of user experience, but it should not independently support major technical, medical, financial, legal, or scientific conclusions.

### Search log

Maintain a reproducible search log:

```markdown
| Date | Platform | Query | Filters | Useful results | Follow-up |
|---|---|---|---|---|---|
| | | | | | |
```

Record unsuccessful searches when they meaningfully show that evidence could not be located.

## 3. Triage Search Results

Screen results before reading every source in full.

### Initial screening criteria

Evaluate:

* Direct relevance to the research question.
* Publication date.
* Date of the underlying evidence.
* Author or institution.
* Source type.
* Presence of methods, citations, data, or documentation.
* Whether the source contains original evidence.
* Whether it merely repeats another source.
* Whether the full source is available.

### Prioritization

Generally prioritize:

1. Primary records and original evidence.
2. Peer-reviewed primary research.
3. Systematic reviews and meta-analyses.
4. Authoritative institutional reports.
5. Official technical documentation.
6. Reputable specialist reporting.
7. Secondary analysis.
8. Informal commentary.

This hierarchy is claim-dependent.

Examples:

* A forum may be appropriate evidence of reported user experiences.
* A forum is not sufficient evidence of medical safety.
* A company filing may support revenue figures.
* A company press release alone may not support claims of product superiority.
* Official documentation may establish intended behavior but not necessarily real-world reliability.

### Deduplication

Determine whether sources share the same origin.

Common shared origins include:

* One press release.
* One study.
* One anonymous interview.
* One dataset.
* One regulatory filing.
* One wire-service report.
* One company statement.

Do not count syndicated or repeated coverage as independent confirmation.

## 4. Evaluate Source Quality

Apply an expanded CRAAP evaluation appropriate to the source type.

## Currency

Check:

* Publication date.
* Date of the underlying data or event.
* Update history.
* Corrections.
* Retractions.
* Superseding versions.
* Whether the source describes current or historical conditions.

A recently published article may rely on old data. A long-standing document may still be current if it is actively maintained.

## Relevance

Check:

* Whether the source directly addresses the research question.
* Whether it covers the correct population, geography, product version, or time period.
* Whether it contains enough detail.
* Whether it supplies evidence or only mentions the topic.
* Whether its definitions match those used in the research question.

## Authority

Check:

* Author identity.
* Relevant expertise.
* Institutional role.
* Publisher reputation.
* Editorial or peer-review process.
* Funding.
* Affiliations.
* Conflicts of interest.
* Whether the source is primary, secondary, or tertiary.

Authority is evidence, not proof. An authoritative institution can still publish weak or biased work.

## Accuracy

Check:

* Whether methods are visible.
* Whether claims are supported by data or citations.
* Whether facts can be independently verified.
* Whether quotations match the original context.
* Whether sample size and measurement methods are reasonable.
* Whether uncertainty is reported.
* Whether critiques, corrections, or replications exist.
* Whether the source distinguishes correlation from causation.

## Purpose

Determine whether the source primarily intends to:

* Inform.
* Persuade.
* Sell.
* Advocate.
* Entertain.
* Influence policy.
* Defend an organization.
* Attract attention.

Inspect its language for:

* Promotional framing.
* Alarmism.
* Selective presentation.
* Unsupported certainty.
* Emotional manipulation.
* Omission of alternatives.

Purpose does not automatically invalidate a source, but it affects how its claims should be weighted.

## Specialized Evaluation

### Empirical studies

Inspect:

* Study design.
* Sampling method.
* Sample size.
* Control groups.
* Measurement validity.
* Statistical power.
* Effect size.
* Confidence intervals.
* Missing data.
* Multiple comparisons.
* Researcher degrees of freedom.
* Preregistration.
* Replication status.
* Generalizability.
* Funding and conflicts of interest.

### Systematic reviews and meta-analyses

Inspect:

* Search strategy.
* Inclusion and exclusion criteria.
* Publication bias.
* Heterogeneity.
* Quality of included studies.
* Whether weak studies dominate the result.
* Whether conclusions exceed the underlying evidence.

### Datasets

Inspect:

* Provenance.
* Collection procedure.
* Definitions.
* Units.
* Coverage.
* Missing observations.
* Excluded observations.
* Revision history.
* Sampling bias.
* Licensing.
* Known limitations.

### Technical documentation

Inspect:

* Product and version.
* Release date.
* Maintainer.
* Whether the documentation is current.
* Whether it describes intended or observed behavior.
* Deprecation notices.
* Security advisories.
* Relevant source code or tests.

### News and public claims

Distinguish:

* Article publication date.
* Event date.
* Original source of the information.
* Independent reporting from repeated reporting.
* Named sources from anonymous claims.
* Confirmed facts from preliminary reports.

### Legal and regulatory material

Inspect:

* Jurisdiction.
* Effective date.
* Current status.
* Amendments.
* Appeals.
* Binding versus advisory authority.
* Whether the text is official or a secondary summary.

Do not treat legal commentary as a substitute for the governing text.

## Source confidence rating

Assign each significant source a confidence level.

### High confidence

The source is direct, authoritative, methodologically strong, relevant, and independently supported.

### Moderate confidence

The source is useful and credible but limited by age, scope, methodology, incomplete verification, or dependence on other evidence.

### Low confidence

The source is indirect, weakly supported, highly biased, unverifiable, methodologically poor, or useful mainly as a lead.

Low-confidence sources may still be included when their limitations are explicit.

## 5. Extract Evidence Systematically

Do not rely on memory or unstructured notes.

For each source, record:

```markdown
## Source Record

Citation:

Source type:

Author or institution:

Publication date:

Underlying event or data date:

URL, DOI, archive ID, or document reference:

Question addressed:

Main claim:

Supporting evidence:

Methodology:

Population or sample:

Key numbers:

Limitations:

Funding or conflicts:

Relevant quotation:
> Exact quotation

Location of quotation:
- Page:
- Section:
- Paragraph:
- Timestamp:

Confidence rating:

Follow-up needed:
```

### Evidence-handling rules

* Clearly separate quotations from paraphrases.
* Preserve page, section, paragraph, table, figure, or timestamp references.
* Attach source metadata when extracting a claim, not afterward.
* Do not cite a source for a claim it does not directly support.
* Trace secondary claims to their original source where possible.
* Preserve units, definitions, confidence intervals, and qualifiers.
* Examine methods before accepting conclusions.
* Record negative and inconclusive findings.
* Do not silently resolve ambiguity.

### Claim classification

Label extracted statements as:

* Established fact.
* Reported observation.
* Statistical estimate.
* Experimental result.
* Expert interpretation.
* Author conclusion.
* Witness or user account.
* Assumption.
* Inference.
* Prediction.
* Unverified claim.

## 6. Build a Claim–Evidence Matrix

Organize evidence around claims rather than summarizing sources one at a time.

Use this structure:

```markdown
| Claim | Supporting evidence | Opposing evidence | Independent sources | Shared dependencies | Confidence | Limitations | Verification needed |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
```

### Independence check

For every major claim, determine whether the supporting sources are genuinely independent.

Multiple sources based on the same underlying study, statement, or dataset represent one evidence chain.

### Burden-of-proof rule

Require stronger evidence for claims that are:

* Highly consequential.
* Counterintuitive.
* Politically contested.
* Commercially contested.
* Medical.
* Legal.
* Financial.
* Security-related.
* Safety-related.
* Causal rather than correlational.
* Presented with extreme certainty.

## 7. Cross-Examine the Evidence

Actively attempt to disprove or weaken the emerging conclusion.

### Required checks

Search for:

* Contradictory evidence.
* Failed replications.
* Corrections.
* Retractions.
* Methodological criticism.
* Different definitions.
* Different populations.
* Alternative explanations.
* Negative results.
* Security failures.
* Real-world counterexamples.
* Conflicts of interest.

Evaluate whether disagreement results from:

* Different facts.
* Different definitions.
* Different samples.
* Different time periods.
* Different methods.
* Different assumptions.
* Different incentives.
* Different interpretations of the same evidence.

### Bias checks

Consider:

* Confirmation bias.
* Selection bias.
* Publication bias.
* Survivorship bias.
* Availability bias.
* Sampling bias.
* Measurement bias.
* Reporting bias.
* Sponsorship bias.
* Citation bias.

### Contradiction protocol

When credible sources disagree:

1. Describe the disagreement precisely.
2. Confirm they address the same question.
3. Compare definitions, populations, metrics, and dates.
4. Compare source quality.
5. Check source independence.
6. Identify possible reasons for the disagreement.
7. State which interpretation is better supported.
8. Preserve the disagreement when the evidence is insufficient.

Do not manufacture consensus.

## 8. Synthesize the Findings

Combine the evidence into a coherent answer.

Organize findings into:

1. Strongly supported conclusions.
2. Probable but uncertain conclusions.
3. Disputed findings.
4. Unknown or poorly studied areas.
5. Evidence required to resolve remaining uncertainty.

### Reasoning rules

* Evaluate the total weight of evidence, not source count.
* Give greater weight to direct, independent, and methodologically strong evidence.
* Distinguish correlation from causation.
* Distinguish statistical significance from practical importance.
* Do not generalize beyond the studied population or conditions.
* Mark inferences as inferences.
* Preserve important qualifiers.
* Do not hide evidence that weakens the conclusion.
* Do not convert uncertainty into false precision.

### Calibrated conclusion language

Use language appropriate to the evidence.

#### High confidence

```text
The evidence strongly indicates...
```

#### Moderate confidence

```text
The available evidence suggests...
```

#### Low confidence

```text
There are preliminary indications...
```

#### Conflicting evidence

```text
The evidence is mixed because...
```

#### Insufficient evidence

```text
The available evidence does not support a reliable conclusion.
```

Avoid absolute words such as `proves`, `always`, `never`, or `definitively` unless the evidence genuinely warrants them.

## 9. Verify Claims and Citations

Perform a final evidence audit before responding.

For every major factual claim, verify:

* A citation or source reference exists.
* The source directly supports the claim.
* The wording does not exceed the source’s certainty.
* The source is current enough.
* The primary source has been consulted where possible.
* Names, dates, quotations, numbers, and units are accurate.
* Contradictory evidence is represented fairly.
* Duplicated reporting is not counted as independent confirmation.
* Inferences are visibly marked.
* Limitations are included.
* Links or references lead to the intended source.

### Sentence-level citation rule

When a sentence contains several factual claims, ensure the citation supports all of them. Otherwise:

* Split the sentence.
* Add multiple citations.
* Narrow the claim.

Never attach a citation merely because the source discusses the same general topic.

## 10. Produce the Final Research Output

Adapt the report to the user’s requested format and technical level.

Unless another format is requested, use:

```markdown
# Research Question

# Executive Summary

# Scope and Method

# Key Findings

# Evidence and Analysis

# Conflicting Evidence

# Limitations

# Conclusion

# Confidence Assessment

# Open Questions

# Sources
```

### Executive summary

The executive summary should state:

* The main conclusion.
* The strongest supporting evidence.
* The most important qualification.
* The overall confidence level.

### Method section

Briefly state:

* Research cutoff or search date.
* Source categories consulted.
* Major search concepts.
* Inclusion or exclusion decisions.
* Important methodological limitations.

Do not expose unnecessary private reasoning or internal chain-of-thought. Present concise methodological justification and an evidence trail instead.

### Key findings

For each major finding, provide:

1. The finding.
2. Supporting evidence.
3. Contradictory evidence.
4. Limitations.
5. Confidence level.

### Transparency

Disclose:

* Important assumptions.
* Evidence gaps.
* Reliance on secondary sources.
* Sources that could not be accessed.
* Potentially outdated evidence.
* Conclusions that depend on inference.

## Research Stopping Criteria

Stop researching when:

* Every supporting question has been addressed.
* Major claims are supported by credible evidence.
* Important contradictions have been investigated.
* New searches mostly produce duplicate evidence.
* Remaining gaps are clearly documented.
* The requested depth has been reached.
* The output can be completed without overstating certainty.

Continue researching when:

* A central claim depends on one weak source.
* Important sources disagree without explanation.
* A major claim is supported only by secondary reporting.
* Current information is required but available evidence is outdated.
* A high-stakes conclusion lacks authoritative support.
* A citation chain cannot be traced to its origin.
* Important terminology remains ambiguous.
* Search results reveal a relevant but unexplored evidence category.

## Failure Modes

Avoid:

* Searching before defining the question.
* Treating search-result snippets as evidence.
* Treating repeated reporting as independent confirmation.
* Selecting only evidence that supports the initial hypothesis.
* Assuming institutional prestige guarantees accuracy.
* Ignoring the age of underlying data.
* Mixing quotations, paraphrases, and interpretations.
* Presenting correlation as causation.
* Hiding contradictory evidence.
* Overstating certainty.
* Citing sources that support only part of a claim.
* Summarizing without preserving provenance.
* Inventing missing details.
* Using source quantity as a substitute for source quality.
* Giving all sources equal weight.
* Confusing absence of evidence with evidence of absence.
* Ignoring corrections, retractions, or superseding versions.
* Reporting precise numbers without checking definitions and units.

## Minimum Quality Standard

A completed research task should include:

* A precise research question.
* A documented scope.
* A reproducible search strategy.
* Relevant primary sources where available.
* A balanced selection of evidence.
* Source-quality assessments.
* A claim–evidence trail.
* Explicit examination of contradictions.
* Calibrated conclusions.
* Limitations and unresolved questions.
* Source references for material factual claims.

## Final Quality Gate

Before delivering the answer, confirm:

```markdown
- [ ] The question is clearly defined.
- [ ] The scope and time range are explicit.
- [ ] Primary sources were prioritized.
- [ ] Major claims have direct support.
- [ ] Sources were checked for shared dependencies.
- [ ] Contradictory evidence was investigated.
- [ ] Facts and inferences are clearly separated.
- [ ] Dates, names, figures, quotations, and units were verified.
- [ ] Confidence matches evidence quality.
- [ ] Limitations and unresolved questions are visible.
- [ ] No citation or fact was fabricated.
```

If any critical item fails, continue researching or clearly disclose the limitation.

## Guiding Principle

Produce the most defensible answer permitted by the available evidence—not the most confident, polished, or comprehensive-sounding answer.
