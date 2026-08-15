interface Props {
  children: React.ReactNode;
}

export default function Title({
  children,
}: Props) {
  return (
    <h2 className="text-5xl font-black text-slate-900">
      {children}
    </h2>
  );
}