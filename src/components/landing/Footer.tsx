export default function Footer() {
  return (
    <footer className="border-t border-[#ebebeb] py-[48px] flex justify-between items-center max-md:flex-col max-md:gap-[20px] max-md:text-center">
      <div className="text-[13px] text-[#999999]">
        &copy; 2026 VLDTA
      </div>
      <div className="flex gap-[24px]">
        {["Terms", "Privacy", "Twitter", "Discord"].map((link) => (
          <a
            key={link}
            href="#"
            className="text-[13px] text-[#999999] no-underline hover:text-[#111111] transition-colors"
          >
            {link}
          </a>
        ))}
      </div>
    </footer>
  );
}
