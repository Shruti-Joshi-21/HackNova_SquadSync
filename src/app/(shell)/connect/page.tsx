import ConnectForm from "@/components/ConnectForm";

export default function ConnectPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Connect a repo</h1>
      <p className="mt-1 mb-6 text-muted">
        No sign-in. SquadSync reads public activity from GitHub and checks it against your deadline.
      </p>
      <ConnectForm />
    </div>
  );
}
