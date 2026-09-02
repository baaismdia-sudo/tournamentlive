import { motion } from "framer-motion";
import { Button } from "../components/Button";

export function CtaSection() {
  return (
    <section className="px-6 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-3xl"
      >
        <h2 className="text-4xl font-bold text-[var(--color-heading)] sm:text-5xl">
          Ready to run your next tournament?
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button to="/register" variant="secondary" size="lg" className="!bg-[var(--color-heading)] !text-white">
            Start Free Trial
          </Button>
          <Button href="/contact" size="lg">
            Talk to Us
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
