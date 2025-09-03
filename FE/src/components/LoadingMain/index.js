import styles from "./LoadingMain.module.scss"
function LoadingMain() {

    return (
        <div className={styles.loaderMain}>
          

            <div className={styles.loader}>
                <svg viewBox="0 0 80 80">
                    <rect x="8" y="8" width="64" height="64"></rect>
                </svg>
            </div>
        </div>

    )

}

export default LoadingMain;