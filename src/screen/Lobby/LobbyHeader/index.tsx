import Image from "next/image";
import profileImage from "../../../assets/app-profile.png";

// โลโก้ + ชื่อเกม + คำโปรย
const LobbyHeader = () => {
  return (
    <header className="flex flex-col items-center text-center">
      <Image
        src={profileImage}
        alt="โลโก้ Fake Wavelength TH"
        width={152}
        height={152}
        priority
        className="rounded-[2rem] border-[3px] border-clayEdge shadow-clay"
      />
      <h1 className="mt-5 text-4xl font-semibold tracking-tight text-lightBrown">
        Fake Wavelength TH
      </h1>
      <p className="mt-2 max-w-sm text-base italic text-muted">
        What&apos;s &ldquo;a lot&rdquo; to you isn&apos;t &ldquo;a lot&rdquo; to them. That&apos;s exactly why you have to guess!
      </p>
    </header>
  );
};

export default LobbyHeader;
