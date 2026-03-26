const ALLOWED_KEYWORDS = [
  // Pregnancy
  "pregnan", "prenatal", "postpartum", "trimester", "fetus", "fetal",
  "embryo", "miscarriage", "morning sickness", "labor", "contraction",
  "c-section", "caesarean", "breastfeed", "nursing", "baby", "birth",
  "gestational", "ectopic", "placenta", "amnio", "ultrasound",
  // Menstruation
  "menstrua", "period", "pms", "cramp", "bleeding", "spotting",
  "tampon", "pad", "menstrual cup", "cycle", "irregular period",
  "heavy period", "amenorrhea", "dysmenorrhea",
  // Ovulation
  "ovulat", "fertile", "fertility", "egg release", "basal temperature",
  "cervical mucus", "lh surge", "fertile window",
  // Reproductive health
  "reproduct", "uterus", "uterine", "ovary", "ovarian", "cervix",
  "cervical", "vagina", "pcos", "endometri", "fibroid", "contracepti",
  "birth control", "iud", "condom", "pill", "menopause", "perimenopause",
  "hormone", "estrogen", "progesterone", "hpv", "pap smear",
  "sexually transmitted", "sti", "std", "infertil", "ivf", "iui",
  "conception", "implantation", "fallopian",
  // General women's health context
  "womb", "gynec", "obstetric", "maternal", "perinatal", "neonatal",
  "lactation", "prolactin", "polycystic",
];

const OFF_TOPIC_REPLY =
  "I'm here to help with pregnancy, menstruation, ovulation, fertility, and reproductive health topics only. " +
  "For other questions, please consult an appropriate resource.";

/**
 * Check whether a message falls within the allowed health domain.
 * Returns { allowed: boolean, reply?: string }.
 */
const checkDomain = (message) => {
  const lower = message.toLowerCase();

  const isOnTopic = ALLOWED_KEYWORDS.some((kw) => lower.includes(kw));

  if (isOnTopic) {
    return { allowed: true };
  }

  return { allowed: false, reply: OFF_TOPIC_REPLY };
};

module.exports = { checkDomain };
